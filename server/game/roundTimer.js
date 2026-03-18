const { getRoom, saveRoom, removeRoom } = require('../rooms/roomManager');

// Track active round timers keyed by roomCode
const roomTimers = new Map();

function clearRoomTimers(code) {
  if (roomTimers.has(code)) {
    clearInterval(roomTimers.get(code));
    roomTimers.delete(code);
  }
}

function startRoundTimer(io, room) {
  const { ROUND_DURATION, evaluateRoundEnd } = require('./engine');
  let seconds = ROUND_DURATION;

  clearRoomTimers(room.code);

  const timer = setInterval(async () => {
    seconds--;
    io.to(room.code).emit('round_tick', { seconds });

    if (seconds <= 0) {
      clearInterval(timer);
      roomTimers.delete(room.code);

      const current = await getRoom(room.code);
      if (!current || current.phase !== 'game') return;

      const result = evaluateRoundEnd(current);

      if (result.over) {
        const impostor = current.players.find((p) => p.id === current.impostorId);
        io.to(room.code).emit('game_over', {
          winner: result.winner,
          reason: result.reason,
          impostorId: current.impostorId,
          impostorName: impostor?.name || '???',
          impostorColor: impostor?.color || '#fff',
        });
        await removeRoom(room.code);
      } else {
        current.currentRound += 1;
        current.testsPassed = 0;
        current.sabotagesDone = 0;
        current.votes = {};
        await saveRoom(current);
        io.to(room.code).emit('round_start', { round: current.currentRound });
        startRoundTimer(io, current);
      }
    }
  }, 1000);

  roomTimers.set(room.code, timer);
}

module.exports = { startRoundTimer, clearRoomTimers };
