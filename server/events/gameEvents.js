const { getRoom, saveRoom, getRoomBySocketId } = require('../rooms/roomManager');
const { getChallengeForRound } = require('../game/challenges');
const { runTests } = require('../game/testRunner');

module.exports = function registerGameEvents(io, socket) {

  // ─── CODE CHANGE ──────────────────────────────────────────────────────
  socket.on('code_change', async ({ lineIndex, content } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;
    if (typeof lineIndex !== 'number' || typeof content !== 'string') return;

    // Sanitize — strip HTML tags, limit length per line
    const safe = content.replace(/<[^>]*>/g, '').slice(0, 500);

    // Persist current code state
    if (!room.currentCode) room.currentCode = [];
    room.currentCode[lineIndex] = safe;
    await saveRoom(room);

    // Broadcast to everyone else in the room
    socket.to(room.code).emit('code_change', { playerId: socket.id, lineIndex, content: safe });
  });

  // ─── CAST CATEGORY VOTE ───────────────────────────────────────────────
  socket.on('cast_category_vote', async ({ category } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'voting_category') return;
    if (!Object.prototype.hasOwnProperty.call(room.categoryVotes, category)) return;

    if (!room.categoryVoters) room.categoryVoters = {};
    if (room.categoryVoters[socket.id]) return; // already voted

    room.categoryVoters[socket.id] = category;
    room.categoryVotes[category] = (room.categoryVotes[category] || 0) + 1;
    await saveRoom(room);

    io.to(room.code).emit('vote_counts_updated', { counts: room.categoryVotes });
  });

  // ─── RUN TESTS (server-side sandboxed) ────────────────────────────────
  socket.on('run_tests', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;

    const challenge   = getChallengeForRound(room.chosenCategory, room.currentRound);
    const codeLines   = room.currentCode || challenge.code;
    const { passed, total, results } = await runTests(challenge, codeLines);

    // Passed tests can only increase — never go back down
    const newPassed = Math.max(room.testsPassed || 0, passed);
    const updated   = newPassed !== room.testsPassed;

    if (updated) {
      room.testsPassed = newPassed;
      await saveRoom(room);
      // Broadcast to entire room so all players see the lock
      io.to(room.code).emit('tests_updated', {
        testsPassed: room.testsPassed,
        total,
        results: challenge.tests.map((t, i) => ({ name: t.name, passed: i < room.testsPassed })),
      });
    } else {
      // Just confirm back to the requester
      socket.emit('tests_updated', {
        testsPassed: room.testsPassed,
        total,
        results: challenge.tests.map((t, i) => ({ name: t.name, passed: i < room.testsPassed })),
      });
    }
  });

  // ─── SABOTAGE COMPLETE ────────────────────────────────────────────────
  socket.on('sabotage_done', async ({ index } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;
    if (room.impostorId !== socket.id) return; // only impostor can do this
    if (typeof index !== 'number') return;

    const newDone = Math.max(room.sabotagesDone || 0, index + 1);
    if (newDone !== room.sabotagesDone) {
      room.sabotagesDone = newDone;
      await saveRoom(room);
    }

    // Confirm privately to impostor only
    socket.emit('sabotage_confirmed', { sabotagesDone: room.sabotagesDone });
  });
};
