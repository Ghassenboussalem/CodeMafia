// server/events/voteEvents.js

const { getRoom, saveRoom, removeRoom, getRoomBySocketId } = require('../rooms/roomManager');
const { tallyVotes, evaluateVoteResult, VOTE_DURATION } = require('../game/engine');
const { startRoundTimer, clearRoomTimers } = require('../game/roundTimer');

const voteTimers = new Map();

module.exports = function registerVoteEvents(io, socket) {

  socket.on('call_emergency', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;

    if (!room.emergencyUsedBy) room.emergencyUsedBy = [];
    if (room.emergencyUsedBy.includes(socket.id)) {
      return socket.emit('error', { message: 'You already used your emergency meeting.' });
    }

    room.emergencyUsedBy.push(socket.id);
    room.phase = 'emergency';
    const caller = room.players.find((p) => p.id === socket.id);
    await saveRoom(room);
    clearRoomTimers(room.code);

    io.to(room.code).emit('emergency_called', {
      calledBy: caller?.name || 'Unknown',
      calledById: socket.id,
    });

    setTimeout(async () => {
      const current = await getRoom(room.code);
      if (!current) return;
      current.phase = 'voting_players';
      current.votes = {};
      await saveRoom(current);

      io.to(room.code).emit('voting_start', {
        players: current.players.map((p) => ({
          id: p.id, name: p.name, color: p.color, colorName: p.colorName,
        })),
        duration: VOTE_DURATION,
      });

      startVoteTimer(io, current);
    }, 3000);
  });

  socket.on('cast_player_vote', async ({ targetId } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'voting_players') return;
    if (!room.votes) room.votes = {};
    if (room.votes[socket.id]) return;
    // Eliminated players are not in room.players — silently reject
    if (!room.players.find((p) => p.id === socket.id)) return;

    const validTarget = targetId && targetId !== socket.id && room.players.find((p) => p.id === targetId);
    room.votes[socket.id] = validTarget ? targetId : 'skip';
    await saveRoom(room);
    socket.emit('vote_recorded');

    // ── Auto-resolve if all active players have voted ──────────────────
    await checkAllVoted(io, room.code);
  });

  socket.on('skip_vote', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'voting_players') return;
    if (!room.votes) room.votes = {};
    if (room.votes[socket.id]) return;
    if (!room.players.find((p) => p.id === socket.id)) return;

    room.votes[socket.id] = 'skip';
    await saveRoom(room);
    socket.emit('vote_recorded');

    // ── Auto-resolve if all active players have voted ──────────────────
    await checkAllVoted(io, room.code);
  });
};

// If every active player has cast a vote, resolve immediately
async function checkAllVoted(io, roomCode) {
  const room = await getRoom(roomCode);
  if (!room || room.phase !== 'voting_players') return;

  const totalPlayers = room.players.length;
  const totalVotes   = Object.keys(room.votes || {}).length;

  if (totalVotes >= totalPlayers) {
    // Cancel the countdown timer — we're resolving early
    if (voteTimers.has(roomCode)) {
      clearInterval(voteTimers.get(roomCode));
      voteTimers.delete(roomCode);
    }
    await resolveVote(io, roomCode);
  }
}

function startVoteTimer(io, room) {
  let seconds = VOTE_DURATION;
  if (voteTimers.has(room.code)) clearInterval(voteTimers.get(room.code));

  const timer = setInterval(async () => {
    seconds--;
    io.to(room.code).emit('vote_tick_player', { seconds });

    if (seconds <= 0) {
      clearInterval(timer);
      voteTimers.delete(room.code);
      await resolveVote(io, room.code);
    }
  }, 1000);

  voteTimers.set(room.code, timer);
}

async function resolveVote(io, roomCode) {
  const current = await getRoom(roomCode);
  if (!current) return;
  // Guard: only resolve once
  if (current.phase === 'resolving') return;
  current.phase = 'resolving';
  await saveRoom(current);

  // Tally BEFORE removing anyone
  const eliminated = tallyVotes(current.votes || {}, current.players);
  const result = evaluateVoteResult(current, eliminated);

  // Grab impostor info before any removal
  const impostorPlayer = current.players.find((p) => p.id === current.impostorId)
    || (eliminated?.id === current.impostorId ? eliminated : { name: '???', color: '#fff' });

  // Remove eliminated player from room
  if (eliminated) {
    current.players = current.players.filter((p) => p.id !== eliminated.id);
    // Tell eliminated player they are out → spectator mode
    io.to(eliminated.id).emit('you_were_eliminated', {
      yourName: eliminated.name,
      yourColor: eliminated.color,
    });
  }

  await saveRoom(current);

  // Broadcast vote result to everyone (including spectating eliminated player)
  io.to(roomCode).emit('vote_result', {
    eliminated: eliminated
      ? { id: eliminated.id, name: eliminated.name, color: eliminated.color }
      : null,
  });

  if (result.over) {
    setTimeout(async () => {
      io.to(roomCode).emit('game_over', {
        winner: result.winner,
        reason: result.reason,
        impostorId: current.impostorId,
        impostorName: impostorPlayer.name,
        impostorColor: impostorPlayer.color,
      });
      await removeRoom(roomCode);
    }, 2500);
  } else {
    // Wrong person eliminated — start next round
    current.phase = 'game';
    current.currentRound = (current.currentRound || 1) + 1;
    current.testsPassed = 0;
    current.sabotagesDone = 0;
    current.votes = {};
    await saveRoom(current);

    setTimeout(() => {
      io.to(roomCode).emit('round_start', { round: current.currentRound });
      startRoundTimer(io, current);
    }, 2500);
  }
}