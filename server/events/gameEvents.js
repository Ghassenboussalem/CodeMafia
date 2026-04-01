const { getRoom, saveRoom, getRoomBySocketId } = require('../rooms/roomManager');
const { getChallengeForCategory } = require('../game/challenges');
const { runTests } = require('../game/testRunner');

// Per-socket run_tests rate limiting (1 execution per 1.5s per socket)
const runTestsLastRun = new Map();
const RUN_TESTS_MIN_INTERVAL_MS = 1500;

// Impostor edit cooldown: socketId → lastEditTimestamp
const impostorLastEdit = new Map();
const IMPOSTOR_EDIT_COOLDOWN_MS = 3000;

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

    if (!room.cursors) room.cursors = {};
    room.cursors[socket.id] = {
      playerId:  player.id,
      lineIndex: typeof lineIndex === 'number' ? lineIndex : 0,
      col:       typeof col === 'number' ? col : 0,
      color:     player.color,
      colorName: player.colorName || player.name,
    };

    socket.to(room.code).emit('cursors_updated', {
      cursors: [room.cursors[socket.id]],
    });
  });

  socket.on('disconnect', () => {
    impostorLastEdit.delete(socket.id);
    runTestsLastRun.delete(socket.id);
  });

  // ── Full-doc change (replaces per-line code_change) ──────────────────────
  // Client sends the entire document as a string on every edit.
  // Server stores it, broadcasts to all others, then auto-runs tests.
  socket.on('doc_change', async (newDoc) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;
    if (typeof newDoc !== 'string') return;

    // Enforce impostor edit cooldown
    const impostorIds = room.impostorIds || [room.impostorId];
    if (impostorIds.includes(socket.id)) {
      const lastEdit = impostorLastEdit.get(socket.id) || 0;
      if (Date.now() - lastEdit < IMPOSTOR_EDIT_COOLDOWN_MS) return;
      impostorLastEdit.set(socket.id, Date.now());
    }

    // Store as line array (rest of the game engine uses room.currentCode[])
    const lines = newDoc.split('\n').map((l) => stripHtml(l).slice(0, 500));
    room.currentCode = lines;

    // Track author per line from this edit
    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      if (!room.lineAuthors) room.lineAuthors = {};
      lines.forEach((_, i) => {
        // Only update author for lines that changed (simple: mark all for this edit)
        room.lineAuthors[i] = {
          playerId:   socket.id,
          playerName: player.name,
          color:      player.color,
          colorName:  player.colorName,
        };
      });
    }

    await saveRoom(room);

    // Broadcast full doc to all other players so their editors update
    socket.to(room.code).emit('doc_update', { doc: newDoc, from: socket.id });

    // Activity feed
    if (!room.activityFeed) room.activityFeed = [];
    room.activityFeed.push({
      ts: Date.now(), type: 'edit',
      playerId: socket.id,
      playerColor: player?.color || '#888',
      playerName: player?.colorName || player?.name || 'Unknown',
    });
    if (room.activityFeed.length > 30) room.activityFeed = room.activityFeed.slice(-30);

    // Rate-limit test runs
    const now = Date.now();
    const lastRun = runTestsLastRun.get(socket.id) || 0;
    if (now - lastRun < RUN_TESTS_MIN_INTERVAL_MS) return;
    runTestsLastRun.set(socket.id, now);

    // Run tests against the shared doc
    const challenge = getChallengeForCategory(room.chosenCategory);
    const { passed, total, results } = await runTests(challenge, lines);

    const prevPassed = room.testsPassed || 0;
    room.testsPassed    = passed;
    room.maxTestsPassed = Math.max(room.maxTestsPassed || 0, passed);

    // Activity feed: log test changes
    if (passed !== prevPassed) {
      const prevResults = room.prevTestResults || [];
      for (let i = 0; i < results.length; i++) {
        const prev = prevResults[i];
        const curr = results[i];
        if (prev && prev.passed && !curr.passed) {
          room.activityFeed.push({
            ts: Date.now(), type: 'test_broke', testName: curr.name,
            lastEditorColor: player?.color || '#888',
            lastEditorName: player?.colorName || player?.name || 'Unknown',
          });
        } else if (prev && !prev.passed && curr.passed) {
          room.activityFeed.push({ ts: Date.now(), type: 'test_fixed', testName: curr.name });
        }
      }
      room.prevTestResults = results.map((r) => ({ name: r.name, passed: r.passed }));
      if (room.activityFeed.length > 30) room.activityFeed = room.activityFeed.slice(-30);
    }

    await saveRoom(room);

    io.to(room.code).emit('activity_feed_update', { feed: room.activityFeed.slice(-20) });

    // Broadcast test results to everyone
    io.to(room.code).emit('tests_updated', {
      testsPassed: passed,
      maxPassed:   room.maxTestsPassed,
      total,
      results,
    });
  });

  // ── Legacy run_tests (kept for bots / manual triggers) ───────────────────
  socket.on('run_tests', async () => {
    const now = Date.now();
    const lastRun = runTestsLastRun.get(socket.id) || 0;
    if (now - lastRun < RUN_TESTS_MIN_INTERVAL_MS) return;
    runTestsLastRun.set(socket.id, now);

    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;

    const challenge = getChallengeForCategory(room.chosenCategory);
    const codeLines = (room.currentCode && room.currentCode.length > 0)
      ? room.currentCode.map(stripHtml)
      : [...challenge.code];

    const { passed, total, results } = await runTests(challenge, codeLines);

    const prevPassed = room.testsPassed || 0;
    room.testsPassed    = passed;
    room.maxTestsPassed = Math.max(room.maxTestsPassed || 0, passed);
    await saveRoom(room);

    const testPayload = { testsPassed: passed, maxPassed: room.maxTestsPassed, total, results };

    if (passed !== prevPassed) {
      io.to(room.code).emit('tests_updated', testPayload);
    } else {
      socket.emit('tests_updated', testPayload);
    }
  });

  // ── Full state resync ─────────────────────────────────────────────────────
  socket.on('request_full_sync', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;
    const challenge = getChallengeForCategory(room.chosenCategory);
    const lines = room.currentCode || [...challenge.code];
    const doc = lines.join('\n');
    socket.emit('doc_sync', { doc, lineAuthors: room.lineAuthors || {} });
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
};
