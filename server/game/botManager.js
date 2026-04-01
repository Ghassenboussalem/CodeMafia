/**
 * botManager.js — Server-side AI bots for solo/duo play.
 *
 * Bots are virtual players (isBot: true) driven by a per-room tick interval.
 * They directly mutate room state and emit to the room via `io`.
 *
 * Civilian bots: apply fix hints at 75% accuracy, moderate typing pace.
 * Impostor bots:  blend in 30s, then sabotage; use ALL 3 powers repeatedly
 *                 (once per cooldown cycle, not just once per game).
 */

const { getRoom, saveRoom } = require('../rooms/roomManager');
const { getChallengeForCategory } = require('./challenges');
const { getHintsForChallenge } = require('./challengeHints');

// ── Bot name pool ──────────────────────────────────────────────────────────
const BOT_NAMES   = ['Bit', 'Byte', 'Nano', 'Hex', 'Null', 'Cache', 'Stack'];
const BOT_COLORS  = ['#16a085', '#d35400', '#7f8c8d'];
const BOT_CNAMES  = ['Teal', 'Pumpkin', 'Grey'];

// Per-room: roomCode → intervalId
const botIntervals = new Map();

// Per-room: roomCode → { botId → { lastPowerUse: { type → ts }, startedAt } }
const botState = new Map();

// Sabotage power cooldowns (ms) — mirrors sabotageEvents.js
const POWER_COOLDOWNS = {
  lights_out: 90_000,
  quiz:       120_000,
  shuffle:    90_000,
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Injects `count` bot players into room.players.
 * Call BEFORE saving or broadcasting the room.
 */
function addBotsToRoom(room, count) {
  const existing = room.players.length;
  for (let i = 0; i < count; i++) {
    const slot = existing + i;
    const nameIdx = slot % BOT_NAMES.length;
    const colorIdx = i % BOT_COLORS.length;
    room.players.push({
      id:         `bot_${slot}_${room.code}`,
      name:       BOT_NAMES[nameIdx],
      color:      BOT_COLORS[colorIdx],
      colorName:  BOT_CNAMES[colorIdx],
      ready:      true,
      isBot:      true,
      rejoinToken: null,
    });
  }
  return room;
}

/**
 * Start bot tick loop for a game.
 * @param {object} io   — Socket.IO server
 * @param {object} room — Room state at game start
 */
function startBotTick(io, room) {
  stopBotTick(room.code); // clear any previous

  const bots = room.players.filter((p) => p.isBot);
  if (bots.length === 0) return;

  // Init per-bot state
  const state = {};
  bots.forEach((b) => {
    state[b.id] = {
      startedAt: Date.now(),
      lastAction: Date.now() - 5000, // allow first action after 5s
      lastPowerUse: { lights_out: 0, quiz: 0, shuffle: 0 },
      persona: 'blend', // 'blend' | 'active'
    };
  });
  botState.set(room.code, state);

  // Stagger initial ticks so bots don't act in lockstep
  bots.forEach((bot, i) => {
    const delay = 5000 + i * 4000 + Math.random() * 3000;
    setTimeout(() => {
      const interval = setInterval(() => {
        runBotTick(io, room.code, bot.id);
      }, nextInterval());
      // Store: we over-write per-bot but the Map holds it; simpler to track by room
      if (!botIntervals.has(room.code)) botIntervals.set(room.code, []);
      botIntervals.get(room.code).push(interval);
    }, delay);
  });
}

/**
 * Stop all bot intervals for a room.
 */
function stopBotTick(roomCode) {
  const intervals = botIntervals.get(roomCode);
  if (intervals) {
    intervals.forEach(clearInterval);
    botIntervals.delete(roomCode);
  }
  botState.delete(roomCode);
}

// ── Internal helpers ────────────────────────────────────────────────────────

/** Returns a random realistic action interval (8–18 seconds). */
function nextInterval() {
  return 8000 + Math.random() * 10_000;
}

function stripHtml(str) {
  return String(str || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function runBotTick(io, roomCode, botId) {
  const room = await getRoom(roomCode);
  if (!room || room.phase !== 'game') return;

  const bot = room.players.find((p) => p.id === botId);
  if (!bot) return; // bot was eliminated

  const state = botState.get(roomCode);
  if (!state || !state[botId]) return;

  const bs     = state[botId];
  const now    = Date.now();
  const age    = now - bs.startedAt; // how long the bot has been in game

  const challenge = getChallengeForCategory(room.chosenCategory);
  const allHints  = getHintsForChallenge(challenge.id);

  const impostorIds = room.impostorIds || [room.impostorId];
  const isImpostor  = impostorIds.includes(botId);

  if (isImpostor) {
    await runImpostorTick(io, room, bot, bs, now, age, challenge, allHints);
  } else {
    await runCivilianTick(io, room, bot, bs, now, challenge, allHints);
  }

  // Save updated state (lineVersions, currentCode)
  await saveRoom(room);
  bs.lastAction = now;
}

// ── Civilian bot ────────────────────────────────────────────────────────────

async function runCivilianTick(io, room, bot, bs, now, challenge, allHints) {
  if (!room.currentCode) room.currentCode = [...challenge.code];
  if (!room.lineVersions) room.lineVersions = {};

  // Find failing tests
  const failedTestIndices = [];
  (room.prevTestResults || []).forEach((r, i) => {
    if (!r.passed) failedTestIndices.push(i);
  });

  // If no test results yet or nothing failing, do a busy idle edit
  if (failedTestIndices.length === 0) {
    busyIdleEdit(io, room, bot);
    return;
  }

  // Pick a random failing test and apply its fix
  const targetIdx  = failedTestIndices[Math.floor(Math.random() * failedTestIndices.length)];
  const hint       = allHints[targetIdx];
  if (!hint || !hint.fix) return;

  const lineIndex  = hint.fix.line - 1; // hints are 1-indexed
  let   fixContent = hint.fix.code;

  // 75% accuracy: occasionally introduce a tiny mistake
  if (Math.random() < 0.25) {
    fixContent = scrambleSlightly(fixContent);
  }

  applyBotEdit(io, room, bot, lineIndex, fixContent);

  // After edit, trigger run_tests via server-side (no socket needed)
  setTimeout(() => triggerRunTests(io, room.code), 1200);
}

// ── Impostor bot ───────────────────────────────────────────────────────────

async function runImpostorTick(io, room, bot, bs, now, age, challenge, allHints) {
  if (!room.currentCode) room.currentCode = [...challenge.code];
  if (!room.lineVersions) room.lineVersions = {};

  // First 30s: blend phase — make civilian-looking neutral edits
  if (age < 30_000) {
    busyIdleEdit(io, room, bot);
    return;
  }

  // Try to use a sabotage power (respects cooldowns, can use all 3 repeatedly)
  const powerUsed = await tryUsePower(io, room, bot, bs, now);

  // 50% chance to also do a sabotage code edit this tick
  if (!powerUsed || Math.random() < 0.5) {
    await doSabotageEdit(io, room, bot, allHints);
  }
}

async function tryUsePower(io, room, bot, bs, now) {
  const powers = ['lights_out', 'quiz', 'shuffle'];
  // Omit lights_out for bots (no cursor to track) — use quiz and shuffle
  const botPowers = ['quiz', 'shuffle'];

  for (const type of shuffleArray(botPowers)) {
    const lastUse = bs.lastPowerUse[type] || 0;
    const cooldown = POWER_COOLDOWNS[type];
    if (now - lastUse >= cooldown) {
      // Also check no other sabotage is currently active (in-memory store check)
      // We do a soft check — just ensure we don't spam
      const { getRandomQuiz } = require('./quizBank');
      bs.lastPowerUse[type] = now;

      let payload = { type, duration: type === 'quiz' ? 15_000 : 25_000 };

      if (type === 'quiz') {
        const quiz = getRandomQuiz(room.usedQuizIds || []);
        room.usedQuizIds = [...(room.usedQuizIds || []), quiz.id];
        payload = {
          ...payload,
          question: quiz.question,
          options: quiz.options,
          quizId: quiz.id,
        };
        // Schedule forced end
        setTimeout(() => {
          io.to(room.code).emit('sabotage_ended', { type: 'quiz' });
        }, 15_000);
      } else {
        const offset = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.floor(Math.random() * 5));
        payload.offset = offset;
        setTimeout(() => {
          io.to(room.code).emit('sabotage_ended', { type: 'shuffle' });
        }, 25_000);
      }

      // Add to activity feed
      if (!room.activityFeed) room.activityFeed = [];
      const labels = { quiz: '🧩 Quiz Bomb', shuffle: '🔀 Code Shuffle' };
      room.activityFeed.push({ ts: now, type: 'sabotage', text: `${labels[type]} activated!` });
      if (room.activityFeed.length > 30) room.activityFeed = room.activityFeed.slice(-30);
      await saveRoom(room);

      io.to(room.code).emit('sabotage_activated', payload);
      io.to(room.code).emit('activity_feed_update', { feed: room.activityFeed.slice(-20) });
      return true;
    }
  }
  return false;
}

async function doSabotageEdit(io, room, bot, allHints) {
  // Find currently passing tests to target (break them)
  const passingIndices = [];
  (room.prevTestResults || []).forEach((r, i) => {
    if (r.passed) passingIndices.push(i);
  });

  if (passingIndices.length === 0) {
    busyIdleEdit(io, room, bot);
    return;
  }

  const targetIdx = passingIndices[Math.floor(Math.random() * passingIndices.length)];
  const hint = allHints[targetIdx];
  if (!hint || !hint.sabotage) return;

  const lineIndex      = hint.sabotage.line - 1;
  const sabotageContent = hint.sabotage.code;

  // 50% success rate — sometimes just make an innocent-looking edit
  const content = Math.random() < 0.5
    ? sabotageContent
    : room.currentCode[lineIndex] || ''; // pretend to "fix" (no-op)

  applyBotEdit(io, room, bot, lineIndex, content);
  setTimeout(() => triggerRunTests(io, room.code), 1200);
}

// ── Shared utilities ────────────────────────────────────────────────────────

function applyBotEdit(io, room, bot, lineIndex, content) {
  const safe = stripHtml(content).slice(0, 500);
  if (!room.currentCode) return;
  while (room.currentCode.length <= lineIndex) room.currentCode.push('');

  room.currentCode[lineIndex] = safe;

  if (!room.lineAuthors) room.lineAuthors = {};
  room.lineAuthors[lineIndex] = {
    playerId: bot.id, playerName: bot.name,
    color: bot.color, colorName: bot.colorName,
  };

  // Broadcast the full updated doc so all clients stay in sync
  const doc = room.currentCode.join('\n');
  io.to(room.code).emit('doc_update', { doc, from: bot.id });
}

function busyIdleEdit(io, room, bot) {
  // Pick a random line and "re-type" existing content (looks like activity)
  if (!room.currentCode || room.currentCode.length === 0) return;
  const lineIndex = Math.floor(Math.random() * Math.min(room.currentCode.length, 20));
  const content   = room.currentCode[lineIndex] || '';
  applyBotEdit(io, room, bot, lineIndex, content);
}

async function triggerRunTests(io, roomCode) {
  const { runTests } = require('./testRunner');
  const room = await getRoom(roomCode);
  if (!room || room.phase !== 'game') return;

  const challenge = getChallengeForCategory(room.chosenCategory);
  const codeLines = (room.currentCode || []).map(stripHtml);
  const { passed, total, results } = await runTests(challenge, codeLines);

  const prevPassed = room.testsPassed || 0;
  room.testsPassed    = passed;
  room.maxTestsPassed = Math.max(room.maxTestsPassed || 0, passed);

  // Update prevTestResults for next bot decision
  room.prevTestResults = results.map(r => ({ name: r.name, passed: r.passed }));

  await saveRoom(room);

  const payload = { testsPassed: passed, maxPassed: room.maxTestsPassed, total, results };
  if (passed !== prevPassed) {
    io.to(roomCode).emit('tests_updated', payload);
  }

  // Early win check
  if (passed >= 9) {
    const impostor = room.players.find((p) => p.id === room.impostorId);
    io.to(roomCode).emit('game_over', {
      winner: 'civilians', reason: 'All bugs were fixed!',
      impostorId: room.impostorId,
      impostorName: impostor?.name || '???',
      impostorColor: impostor?.color || '#fff',
    });
    stopBotTick(roomCode);
  }
}

function scrambleSlightly(code) {
  // Introduce a subtle off-by-one or operator flip
  if (!code) return code;
  const mutations = [
    (s) => s.replace(/\+ 1\b/, '+ 2'),
    (s) => s.replace(/- 1\b/, '- 2'),
    (s) => s.replace(/\b<=\b/, '<'),
    (s) => s.replace(/\b>=\b/, '>'),
    (s) => s.replace(/\btrue\b/, 'false'),
    (s) => s.replace(/\bFalse\b/, 'True'),
  ];
  const mut = mutations[Math.floor(Math.random() * mutations.length)];
  const result = mut(code);
  // If no mutation matched, return original (don't break lines we can't mutate)
  return result === code ? code : result;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Trigger bot auto-votes during standup.
 * @param {object} io
 * @param {object} room — current room with voting_players phase
 */
function triggerBotVotes(io, room) {
  const bots = room.players.filter((p) => p.isBot);
  if (bots.length === 0) return;

  const impostorIds = room.impostorIds || [room.impostorId];
  const realPlayers = room.players.filter((p) => !p.isBot);

  bots.forEach((bot, i) => {
    const delay = 3000 + i * 1500 + Math.random() * 2000;
    setTimeout(async () => {
      const current = await getRoom(room.code);
      if (!current || current.phase !== 'voting_players') return;
      if (current.votes && current.votes[bot.id]) return;

      let targetId;
      const isImpostorBot = impostorIds.includes(bot.id);

      if (isImpostorBot) {
        // Impostor bot votes for a random real civilian
        const civilians = realPlayers.filter((p) => !impostorIds.includes(p.id));
        targetId = civilians.length > 0
          ? civilians[Math.floor(Math.random() * civilians.length)].id
          : 'skip';
      } else {
        // Civilian bot votes randomly (moderate — 40% chance to skip, adds social uncertainty)
        if (Math.random() < 0.4) {
          targetId = 'skip';
        } else {
          const others = realPlayers.filter((p) => p.id !== bot.id);
          targetId = others.length > 0
            ? others[Math.floor(Math.random() * others.length)].id
            : 'skip';
        }
      }

      if (!current.votes) current.votes = {};
      current.votes[bot.id] = targetId;
      await saveRoom(current);

      // Check if all players (real + bot) have now voted
      const allVoted = Object.keys(current.votes).length >= current.players.length;
      if (allVoted) {
        // Lazy require to avoid circular dependency at module load time
        // (voteEvents imports botManager; botManager must not import voteEvents at top level)
        const { triggerVoteResolution } = require('../events/voteEvents');
        if (triggerVoteResolution) triggerVoteResolution(io, current.code);
      }
    }, delay);
  });
}

module.exports = {
  addBotsToRoom,
  startBotTick,
  stopBotTick,
  triggerBotVotes,
};
