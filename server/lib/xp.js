/**
 * XP rules:
 * Win as civilian        → 100 XP
 * Win as impostor        → 150 XP
 * Catch the impostor     → 50 XP  (civilian who voted correctly)
 * Pass a test            → 20 XP each
 * Complete a sabotage    → 30 XP each (impostor)
 * Survive a vote (not eliminated) → 15 XP
 * Lose                   → 10 XP (participation)
 */

const XP_RULES = {
  WIN_CIVILIAN:      100,
  WIN_IMPOSTOR:      150,
  CATCH_IMPOSTOR:    50,
  TEST_PASSED:       20,
  SABOTAGE_DONE:     30,
  SURVIVE_VOTE:      15,
  PARTICIPATION:     10,
};

const LEVEL_THRESHOLDS = [
  0,     // Level 1
  200,   // Level 2
  500,   // Level 3
  900,   // Level 4
  1400,  // Level 5
  2000,  // Level 6
  2700,  // Level 7
  3500,  // Level 8
  4400,  // Level 9
  5500,  // Level 10
  7000,  // Level 11
  9000,  // Level 12
  11500, // Level 13
  14500, // Level 14
  18000, // Level 15
  22000, // Level 16
  27000, // Level 17
  33000, // Level 18
  40000, // Level 19
  50000, // Level 20
];

function calculateLevel(totalXp) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, 20);
}

function xpToNextLevel(totalXp) {
  const level = calculateLevel(totalXp);
  if (level >= 20) return 0;
  return LEVEL_THRESHOLDS[level] - totalXp;
}

function calculateGameXp({ role, won, testsPassed, sabotagesDone, survived }) {
  let xp = XP_RULES.PARTICIPATION;

  if (won) {
    xp += role === 'impostor' ? XP_RULES.WIN_IMPOSTOR : XP_RULES.WIN_CIVILIAN;
  }

  if (role === 'civilian') {
    xp += (testsPassed || 0) * XP_RULES.TEST_PASSED;
    if (survived) xp += XP_RULES.SURVIVE_VOTE;
  }

  if (role === 'impostor') {
    xp += (sabotagesDone || 0) * XP_RULES.SABOTAGE_DONE;
  }

  return xp;
}

module.exports = {
  XP_RULES,
  LEVEL_THRESHOLDS,
  calculateLevel,
  xpToNextLevel,
  calculateGameXp,
};