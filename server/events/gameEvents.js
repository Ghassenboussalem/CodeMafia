const { getRoom, saveRoom, getRoomBySocketId } = require('../rooms/roomManager');
const { getChallengeForCategory } = require('../game/challenges');
const { runTests } = require('../game/testRunner');

// In-memory cursor store (no Redis — cursors are ephemeral)
const cursorStore = new Map(); // socketId → { playerId, lineIndex, col, color, name }

function stripHtml(str) {
  return String(str || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

module.exports = function registerGameEvents(io, socket) {

  // ── Live cursor presence ─────────────────────────────────────────────────
  socket.on('cursor_move', async ({ lineIndex, col } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    cursorStore.set(socket.id, {
      playerId:  player.id,
      lineIndex: typeof lineIndex === 'number' ? lineIndex : 0,
      col:       typeof col === 'number' ? col : 0,
      color:     player.color,
      colorName: player.colorName || player.name,
    });

    // Broadcast to everyone ELSE in the room
    const cursors = [];
    room.players.forEach((p) => {
      if (p.id === socket.id) return;
      const c = cursorStore.get(p.id);
      if (c) cursors.push(c);
    });
    // Also send the moving cursor to others
    cursors.push(cursorStore.get(socket.id));

    socket.to(room.code).emit('cursors_updated', { cursors: [cursorStore.get(socket.id)] });
  });

  // Clean up cursor when socket disconnects
  socket.on('disconnect', () => {
    cursorStore.delete(socket.id);
  });


  socket.on('code_change', async ({ lineIndex, content, authorColor } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;
    if (typeof lineIndex !== 'number' || typeof content !== 'string') return;

    const safe = stripHtml(content).slice(0, 500);

    if (!room.currentCode) room.currentCode = [...getChallengeForCategory(room.chosenCategory).code];
    while (room.currentCode.length <= lineIndex) room.currentCode.push('');
    room.currentCode[lineIndex] = safe;

    // Track which player last edited each line
    if (!room.lineAuthors) room.lineAuthors = {};
    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      room.lineAuthors[lineIndex] = {
        playerId:   socket.id,
        playerName: player.name,
        color:      player.color,
        colorName:  player.colorName,
      };
    }

    await saveRoom(room);

    socket.to(room.code).emit('code_change', {
      playerId:  socket.id,
      lineIndex,
      content:   safe,
      author:    room.lineAuthors[lineIndex],
    });
  });

  socket.on('cast_category_vote', async ({ category } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'voting_category') return;
    if (!Object.prototype.hasOwnProperty.call(room.categoryVotes, category)) return;
    if (!room.categoryVoters) room.categoryVoters = {};
    if (room.categoryVoters[socket.id]) return;
    room.categoryVoters[socket.id] = category;
    room.categoryVotes[category] = (room.categoryVotes[category] || 0) + 1;
    await saveRoom(room);
    io.to(room.code).emit('vote_counts_updated', { counts: room.categoryVotes });
  });

  socket.on('run_tests', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;

    const challenge = getChallengeForCategory(room.chosenCategory);
    const codeLines = (room.currentCode && room.currentCode.length > 0)
      ? room.currentCode.map(stripHtml)
      : [...challenge.code];

    const { passed, total, results } = await runTests(challenge, codeLines);

    // Tests only go up — impostor can break a test that was passing
    // but we still track the highest point reached
    const prevPassed = room.testsPassed || 0;

    // Actually allow tests to go DOWN — this is how impostor wins
    // We track both current and max
    room.testsPassed    = passed;
    room.maxTestsPassed = Math.max(room.maxTestsPassed || 0, passed);

    await saveRoom(room);

    const testPayload = {
      testsPassed: passed,
      maxPassed:   room.maxTestsPassed,
      total,
      results,
    };

    if (passed !== prevPassed) {
      // Results changed — tell everyone
      io.to(room.code).emit('tests_updated', testPayload);
    } else {
      // No change — only update the requesting player's sidebar
      socket.emit('tests_updated', testPayload);
    }
  });
};