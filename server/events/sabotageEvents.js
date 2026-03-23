/**
 * sabotageEvents.js — Impostor sabotage powers
 *
 * Powers:
 *   lights_out  — circular spotlight for civilians (20s, 90s cooldown)
 *   quiz        — pop quiz freezes all players (15s, 120s cooldown)
 *   shuffle     — scrambles hint line numbers (25s, 90s cooldown)
 */

const { getRoom, saveRoom, getRoomBySocketId } = require('../rooms/roomManager');
const { getRandomQuiz } = require('../game/quizBank');

const SABOTAGE_CONFIG = {
  lights_out: { duration: 20000, cooldown: 90000 },
  quiz:       { duration: 15000, cooldown: 120000 },
  shuffle:    { duration: 25000, cooldown: 90000 },
};

const QUIZ_PENALTY_SECONDS = 15;

// In-memory cooldown tracking: roomCode → { lights_out: lastUsedMs, quiz: ..., shuffle: ... }
const cooldowns = new Map();
// In-memory active sabotage tracking: roomCode → { type, endsAt }
const activeSabotages = new Map();
// Track quiz answers per room: roomCode → { questionId, correctIndex, answers: { socketId: answerIdx } }
const activeQuizzes = new Map();
// Track used quiz IDs per room to avoid repeats: roomCode → [ids]
const usedQuizIds = new Map();

function getCooldowns(roomCode) {
  if (!cooldowns.has(roomCode)) {
    cooldowns.set(roomCode, { lights_out: 0, quiz: 0, shuffle: 0 });
  }
  return cooldowns.get(roomCode);
}

module.exports = function registerSabotageEvents(io, socket) {

  socket.on('activate_sabotage', async ({ type } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'game') return;

    // Only impostor can sabotage
    const impostorIds = room.impostorIds || [room.impostorId];
    if (!impostorIds.includes(socket.id)) return;

    // Validate type
    const config = SABOTAGE_CONFIG[type];
    if (!config) return;

    // Check cooldown
    const cd = getCooldowns(room.code);
    const now = Date.now();
    if (now - cd[type] < config.cooldown) {
      const remaining = Math.ceil((config.cooldown - (now - cd[type])) / 1000);
      socket.emit('sabotage_error', { message: `${type} on cooldown: ${remaining}s remaining` });
      return;
    }

    // Check no other sabotage is active
    const active = activeSabotages.get(room.code);
    if (active && active.endsAt > now) {
      socket.emit('sabotage_error', { message: 'Another sabotage is already active' });
      return;
    }

    // Set cooldown
    cd[type] = now;

    // Activate
    activeSabotages.set(room.code, { type, endsAt: now + config.duration });

    // Build sabotage payload
    const payload = { type, duration: config.duration };

    if (type === 'quiz') {
      // Pick a quiz question
      const used = usedQuizIds.get(room.code) || [];
      const quiz = getRandomQuiz(used);
      used.push(quiz.id);
      usedQuizIds.set(room.code, used);

      payload.question = quiz.question;
      payload.options = quiz.options;
      payload.quizId = quiz.id;
      // Don't send correctIndex to clients — server validates

      activeQuizzes.set(room.code, {
        correctIndex: quiz.correctIndex,
        answers: {},
        endsAt: now + config.duration,
      });

      // Auto-end quiz after duration
      setTimeout(() => {
        const quizState = activeQuizzes.get(room.code);
        if (quizState) {
          processQuizResults(io, room.code, quizState);
          activeQuizzes.delete(room.code);
        }
        activeSabotages.delete(room.code);
        io.to(room.code).emit('sabotage_ended', { type: 'quiz' });
      }, config.duration);
    } else if (type === 'shuffle') {
      // Random offset for hint line numbers
      const offset = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.floor(Math.random() * 5));
      payload.offset = offset;

      setTimeout(() => {
        activeSabotages.delete(room.code);
        io.to(room.code).emit('sabotage_ended', { type: 'shuffle' });
      }, config.duration);
    } else {
      // lights_out
      setTimeout(() => {
        activeSabotages.delete(room.code);
        io.to(room.code).emit('sabotage_ended', { type: 'lights_out' });
      }, config.duration);
    }

    // Broadcast to all players
    io.to(room.code).emit('sabotage_activated', payload);

    // Add to activity feed
    if (!room.activityFeed) room.activityFeed = [];
    const typeLabels = { lights_out: '⚡ Lights Out', quiz: '🧩 Quiz Bomb', shuffle: '🔀 Code Shuffle' };
    room.activityFeed.push({
      ts: now,
      type: 'sabotage',
      text: `${typeLabels[type]} activated!`,
    });
    await saveRoom(room);
    io.to(room.code).emit('activity_feed_update', { feed: room.activityFeed.slice(-20) });

    // Also send cooldown state to the impostor
    const cooldownState = {};
    for (const [key, cfg] of Object.entries(SABOTAGE_CONFIG)) {
      const elapsed = now - cd[key];
      cooldownState[key] = {
        ready: elapsed >= cfg.cooldown,
        remainingMs: Math.max(0, cfg.cooldown - elapsed),
      };
    }
    socket.emit('sabotage_cooldowns', cooldownState);
  });

  socket.on('quiz_answer', async ({ answer } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room) return;

    const quizState = activeQuizzes.get(room.code);
    if (!quizState) return;

    // Don't allow double-answer
    if (quizState.answers[socket.id] !== undefined) return;

    quizState.answers[socket.id] = answer;

    // Tell the player if they got it right
    const correct = answer === quizState.correctIndex;
    socket.emit('quiz_result', { correct, correctIndex: quizState.correctIndex });
  });

  // Sus marks during standup
  socket.on('mark_sus', async ({ targetId } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room) return;
    // Only during emergency/voting phases
    if (!['emergency', 'voting_players'].includes(room.phase)) return;
    if (targetId === socket.id) return; // can't sus yourself

    io.to(room.code).emit('sus_marked', {
      fromId: socket.id,
      targetId,
    });
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    // Cooldowns are per-room so they persist. No cleanup needed per-socket.
  });
};

/**
 * Apply quiz time penalties: each player who answered wrong loses QUIZ_PENALTY_SECONDS.
 * In practice, we deduct from the game timer for the whole room.
 */
async function processQuizResults(io, roomCode, quizState) {
  const room = await getRoom(roomCode);
  if (!room || room.phase !== 'game') return;

  const impostorIds = room.impostorIds || [room.impostorId];
  let wrongCount = 0;

  for (const player of room.players) {
    // Skip impostor — they don't get penalized (they chose the quiz)
    if (impostorIds.includes(player.id)) continue;

    const answer = quizState.answers[player.id];
    if (answer === undefined || answer !== quizState.correctIndex) {
      wrongCount++;
    }
  }

  if (wrongCount > 0) {
    const penalty = wrongCount * QUIZ_PENALTY_SECONDS;
    room.gameSecondsLeft = Math.max(0, (room.gameSecondsLeft || 0) - penalty);
    await saveRoom(room);

    io.to(roomCode).emit('quiz_penalty', {
      wrongCount,
      totalPenalty: penalty,
      newSecondsLeft: room.gameSecondsLeft,
    });
  }
}

// Export cleanup helper for when a game ends
module.exports.cleanupRoom = function cleanupRoom(roomCode) {
  cooldowns.delete(roomCode);
  activeSabotages.delete(roomCode);
  activeQuizzes.delete(roomCode);
  usedQuizIds.delete(roomCode);
};
