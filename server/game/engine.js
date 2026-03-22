/**
 * Game engine — no rounds, single 8-minute game timer.
 * 9 tests total (3 per section), accumulate throughout the game.
 * Impostor wins by having tests fail at game end.
 */

const GAME_DURATION       = 8 * 60; // 8 minutes in seconds
const VOTE_DURATION       = 30;
const CATEGORY_VOTE_DURATION = 15;

function evaluateGameEnd(room) {
  const passed = room.testsPassed || 0;

  // Civilians win if all 9 tests pass
  if (passed >= 9) {
    return { over: true, winner: 'civilians', reason: 'All bugs were fixed!' };
  }

  // Timer expired — impostor survived
  return {
    over: true,
    winner: 'impostor',
    reason: `Time ran out with ${9 - passed} bug${9 - passed !== 1 ? 's' : ''} remaining!`,
  };
}

function evaluateVoteResult(room, eliminated) {
  if (!eliminated) return { over: false };

  // Check all impostor ids (supports multiple impostors)
  const impostorIds = room.impostorIds || [room.impostorId];

  if (impostorIds.includes(eliminated.id)) {
    return { over: true, winner: 'civilians', reason: 'The impostor was caught!' };
  }

  // Wrong person — check if impostor now has effective majority
  const remainingAfter = room.players.filter((p) => p.id !== eliminated.id);
  const remainingImpostors = impostorIds.filter((id) =>
    remainingAfter.find((p) => p.id === id)
  );

  if (remainingAfter.length <= remainingImpostors.length + 1) {
    return { over: true, winner: 'impostor', reason: 'The impostor outlasted the team!' };
  }

  return { over: false };
}

function tallyVotes(votes, players) {
  if (!votes || Object.keys(votes).length === 0) return null;
  const counts = {};
  for (const targetId of Object.values(votes)) {
    counts[targetId] = (counts[targetId] || 0) + 1;
  }
  let maxCount = 0;
  let topIds = [];
  for (const [id, count] of Object.entries(counts)) {
    if (count > maxCount) { maxCount = count; topIds = [id]; }
    else if (count === maxCount) topIds.push(id);
  }
  if (topIds.length !== 1) return null;
  if (topIds[0] === 'skip') return null;
  return players.find((p) => p.id === topIds[0]) || null;
}

function pickWinningCategory(categoryVotes) {
  let max = 0;
  let winners = [];
  for (const [cat, count] of Object.entries(categoryVotes)) {
    if (count > max) { max = count; winners = [cat]; }
    else if (count === max) winners.push(cat);
  }
  if (winners.length === 0) return Object.keys(categoryVotes)[0];
  return winners[Math.floor(Math.random() * winners.length)];
}

module.exports = {
  GAME_DURATION,
  VOTE_DURATION,
  CATEGORY_VOTE_DURATION,
  evaluateGameEnd,
  evaluateVoteResult,
  tallyVotes,
  pickWinningCategory,
};