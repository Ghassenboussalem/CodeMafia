const { getRoom, saveRoom, removeRoom, getRoomBySocketId } = require('../rooms/roomManager');
const { tallyVotes, evaluateVoteResult, VOTE_DURATION } = require('../game/engine');
const { startGameTimer, clearGameTimer } = require('../game/gameTimer');
const { triggerBotVotes } = require('../game/botManager');

const voteTimers = new Map();

module.exports = function registerVoteEvents(io, socket) {

  // Now called "standup" in the UI but same mechanic
  socket.on('call_emergency', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;
    if (!room.emergencyUsedBy) room.emergencyUsedBy = [];
    if (room.emergencyUsedBy.includes(socket.id)) {
      return socket.emit('error', { message: 'You already called a standup this session.' });
    }
    room.emergencyUsedBy.push(socket.id);
    room.phase = 'emergency';
    const caller = room.players.find((p) => p.id === socket.id);

    // Save remaining seconds so we can resume after vote
    room.gameSecondsLeft = room.gameSecondsLeft || 480;
    await saveRoom(room);
    clearGameTimer(room.code);

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
          id: p.id, name: p.name, color: p.color, colorName: p.colorName, isBot: p.isBot || false,
        })),
        duration: VOTE_DURATION,
      });
      // Trigger bot auto-votes after a human-realistic delay
      triggerBotVotes(io, current);
      startVoteTimer(io, current);
    }, 3000);
  });

  socket.on('cast_player_vote', async ({ targetId } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'voting_players') return;
    if (!room.votes) room.votes = {};
    if (room.votes[socket.id]) return;
    if (!room.players.find((p) => p.id === socket.id)) return;
    const validTarget = targetId && targetId !== socket.id && room.players.find((p) => p.id === targetId);
    room.votes[socket.id] = validTarget ? targetId : 'skip';
    await saveRoom(room);
    socket.emit('vote_recorded');
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
    await checkAllVoted(io, room.code);
  });
};

async function checkAllVoted(io, roomCode) {
  const room = await getRoom(roomCode);
  if (!room || room.phase !== 'voting_players') return;
  if (Object.keys(room.votes || {}).length >= room.players.length) {
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
  if (current.phase === 'resolving') return;
  current.phase = 'resolving';
  await saveRoom(current);

  const eliminated   = tallyVotes(current.votes || {}, current.players);
  const result       = evaluateVoteResult(current, eliminated);
  const impostorPlayer = current.players.find((p) => p.id === current.impostorId)
    || (eliminated?.id === current.impostorId ? eliminated : { name: '???', color: '#fff' });

  if (eliminated) {
    current.players = current.players.filter((p) => p.id !== eliminated.id);
    io.to(eliminated.id).emit('you_were_eliminated', {
      yourName: eliminated.name, yourColor: eliminated.color,
    });
  }

  await saveRoom(current);

  io.to(roomCode).emit('vote_result', {
    eliminated: eliminated
      ? { id: eliminated.id, name: eliminated.name, color: eliminated.color }
      : null,
  });

  if (result.over) {
    setTimeout(async () => {
      io.to(roomCode).emit('game_over', {
        winner: result.winner, reason: result.reason,
        impostorId: current.impostorId,
        impostorName: impostorPlayer.name,
        impostorColor: impostorPlayer.color,
      });
      await removeRoom(roomCode);
    }, 2500);
  } else {
    // Resume game timer after vote — keep remaining time
    current.phase = 'game';
    current.votes = {};
    await saveRoom(current);

    setTimeout(() => {
      io.to(roomCode).emit('game_resumed', {
        secondsLeft: current.gameSecondsLeft || 480,
      });
      startGameTimer(io, current);
    }, 2500);
  }
}

// Exported so botManager can trigger early resolution when all bots vote
async function triggerVoteResolution(io, roomCode) {
  await resolveVote(io, roomCode);
}

module.exports.triggerVoteResolution = triggerVoteResolution;