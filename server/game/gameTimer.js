const { getRoom, saveRoom, removeRoom } = require('../rooms/roomManager');

const gameTimers = new Map();

function clearGameTimer(code) {
  if (gameTimers.has(code)) {
    clearInterval(gameTimers.get(code));
    gameTimers.delete(code);
  }
}

function startGameTimer(io, room) {
  const { GAME_DURATION, evaluateGameEnd } = require('./engine');
  let seconds = GAME_DURATION;

  clearGameTimer(room.code);

  const timer = setInterval(async () => {
    seconds--;
    io.to(room.code).emit('game_tick', { seconds });

    // Civilians win early if all tests pass
    const current = await getRoom(room.code);
    if (!current || current.phase !== 'game') {
      clearInterval(timer);
      gameTimers.delete(room.code);
      return;
    }

    if ((current.testsPassed || 0) >= 9) {
      clearInterval(timer);
      gameTimers.delete(room.code);
      const impostor = current.players.find((p) => p.id === current.impostorId);
      io.to(room.code).emit('game_over', {
        winner: 'civilians',
        reason: 'All bugs were fixed!',
        impostorId: current.impostorId,
        impostorName: impostor?.name || '???',
        impostorColor: impostor?.color || '#fff',
      });
      await removeRoom(room.code);
      return;
    }

    if (seconds <= 0) {
      clearInterval(timer);
      gameTimers.delete(room.code);

      const result = evaluateGameEnd(current);
      const impostor = current.players.find((p) => p.id === current.impostorId);
      io.to(room.code).emit('game_over', {
        winner: result.winner,
        reason: result.reason,
        impostorId: current.impostorId,
        impostorName: impostor?.name || '???',
        impostorColor: impostor?.color || '#fff',
      });
      await removeRoom(room.code);
    }
  }, 1000);

  gameTimers.set(room.code, timer);
}

module.exports = { startGameTimer, clearGameTimer };