export const LEVEL_THRESHOLDS = [
  0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5500,
  7000, 9000, 11500, 14500, 18000, 22000, 27000, 33000, 40000, 50000,
];

export function calculateLevel(totalXp) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, 20);
}

export function xpToNextLevel(totalXp) {
  const level = calculateLevel(totalXp);
  if (level >= 20) return 0;
  return LEVEL_THRESHOLDS[level] - totalXp;
}