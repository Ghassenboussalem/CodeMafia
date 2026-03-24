const { getRoom, saveRoom, getRoomBySocketId } = require('../rooms/roomManager');
const { getChallengeForCategory } = require('../game/challenges');
const { runTests } = require('../game/testRunner');

// Issue 10: Per-socket run_tests rate limiting (1 execution per 3s per socket)
const runTestsLastRun = new Map(); // socketId → timestamp
const RUN_TESTS_MIN_INTERVAL_MS = 3000;

// Issue 8: Per-room cursor state stored in room object (survives reloads)
// cursorStore is now room.cursors = { socketId: cursorData }

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

    // Issue 7: colorName IS set on player objects from roomManager
    // Issue 8: store cursor in room object (not module-scoped Map)
    if (!room.cursors) room.cursors = {};
    room.cursors[socket.id] = {
      playerId:  player.id,
      lineIndex: typeof lineIndex === 'number' ? lineIndex : 0,
      col:       typeof col === 'number' ? col : 0,
      color:     player.color,
      colorName: player.colorName || player.name,
    };
    // Note: we don't save to Redis on every cursor move (too expensive)
    // Cursors are ephemeral — room object in memory is updated directly

    // Broadcast only this cursor to everyone else
    socket.to(room.code).emit('cursors_updated', {
      cursors: [room.cursors[socket.id]],
    });
  });

  // Clean up cursor on disconnect
  socket.on('disconnect', () => {
    // Cursors will be purged with the room naturally
    impostorLastEdit.delete(socket.id);
    runTestsLastRun.delete(socket.id);
  });


  socket.on('code_change', async ({ lineIndex, content, authorColor, version } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;
    if (typeof lineIndex !== 'number' || typeof content !== 'string') return;

    // Enforce impostor edit cooldown
    const impostorIds = room.impostorIds || [room.impostorId];
    if (impostorIds.includes(socket.id)) {
      const lastEdit = impostorLastEdit.get(socket.id) || 0;
      if (Date.now() - lastEdit < IMPOSTOR_EDIT_COOLDOWN_MS) {
        return; // silently drop — impostor can't spam edits
      }
      impostorLastEdit.set(socket.id, Date.now());
    }

    const safe = stripHtml(content).slice(0, 500);

    if (!room.currentCode) room.currentCode = [...getChallengeForCategory(room.chosenCategory).code];
    if (!room.lineVersions) room.lineVersions = {};
    while (room.currentCode.length <= lineIndex) room.currentCode.push('');

    // ── Version check (optimistic concurrency) ───────────────────────
    const serverVersion = room.lineVersions[lineIndex] || 0;
    const clientVersion = typeof version === 'number' ? version : -1;

    // If client sends a version and it's stale, reject the edit
    if (clientVersion >= 0 && clientVersion < serverVersion) {
      socket.emit('code_reject', {
        lineIndex,
        content: room.currentCode[lineIndex],
        version: serverVersion,
      });
      return;
    }

    // Accept the edit — increment version
    const newVersion = serverVersion + 1;
    room.lineVersions[lineIndex] = newVersion;
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
      version:   newVersion,
      author:    room.lineAuthors[lineIndex],
    });

    // Confirm the new version to the sender too
    socket.emit('code_accepted', { lineIndex, version: newVersion });

    // Activity feed: log the edit
    if (!room.activityFeed) room.activityFeed = [];
    room.activityFeed.push({
      ts: Date.now(),
      type: 'edit',
      playerId: socket.id,
      playerColor: player ? player.color : '#888',
      playerName: player ? (player.colorName || player.name) : 'Unknown',
      lineIndex,
    });
    // Keep only last 30 events
    if (room.activityFeed.length > 30) room.activityFeed = room.activityFeed.slice(-30);
    await saveRoom(room);
    io.to(room.code).emit('activity_feed_update', { feed: room.activityFeed.slice(-20) });
  });

  // ── Full state resync (client can request, also sent periodically) ──────
  socket.on('request_full_sync', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;
    const challenge = getChallengeForCategory(room.chosenCategory);
    const lines = room.currentCode || [...challenge.code];
    socket.emit('code_sync', {
      lines,
      versions: room.lineVersions || {},
      lineAuthors: room.lineAuthors || {},
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
    // Issue 10: Rate limiting — max 1 real test execution per 3s per socket
    const now = Date.now();
    const lastRun = runTestsLastRun.get(socket.id) || 0;
    if (now - lastRun < RUN_TESTS_MIN_INTERVAL_MS) return; // silently drop
    runTestsLastRun.set(socket.id, now);

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

    // Activity feed: log test changes
    if (passed !== prevPassed) {
      if (!room.activityFeed) room.activityFeed = [];
      // Find which tests changed
      const prevResults = room.prevTestResults || [];
      for (let i = 0; i < results.length; i++) {
        const prev = prevResults[i];
        const curr = results[i];
        if (prev && prev.passed && !curr.passed) {
          // A test BROKE — find who last edited in the relevant area
          const lastEditor = room.lineAuthors ? Object.values(room.lineAuthors).slice(-1)[0] : null;
          room.activityFeed.push({
            ts: Date.now(),
            type: 'test_broke',
            testName: curr.name,
            lastEditorColor: lastEditor?.color || '#888',
            lastEditorName: lastEditor?.colorName || lastEditor?.playerName || 'Unknown',
          });
        } else if (prev && !prev.passed && curr.passed) {
          room.activityFeed.push({
            ts: Date.now(),
            type: 'test_fixed',
            testName: curr.name,
          });
        }
      }
      // Store current results for next comparison
      room.prevTestResults = results.map(r => ({ name: r.name, passed: r.passed }));
      if (room.activityFeed.length > 30) room.activityFeed = room.activityFeed.slice(-30);
      await saveRoom(room);
      io.to(room.code).emit('activity_feed_update', { feed: room.activityFeed.slice(-20) });
    }

    if (passed !== prevPassed) {
      // Results changed — tell everyone
      io.to(room.code).emit('tests_updated', testPayload);
    } else {
      // No change — only update the requesting player's sidebar
      socket.emit('tests_updated', testPayload);
    }
  });
};