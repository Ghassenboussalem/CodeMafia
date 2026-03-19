// Now respects room.settings for round count and duration

const DEFAULT_ROUND_DURATION = 60;
const DEFAULT_MAX_ROUNDS = 4;
const VOTE_DURATION = 30;
const CATEGORY_VOTE_DURATION = 15;

function getRoundDuration(room) {
  return room.settings?.roundDuration || DEFAULT_ROUND_DURATION;
}

function getMaxRounds(room) {
  return room.settings?.maxRounds || DEFAULT_MAX_ROUNDS;
}

function evaluateRoundEnd(room) {
  const maxRounds = getMaxRounds(room);
  if (room.currentRound >= maxRounds) {
    if ((room.testsPassed || 0) >= 3) {
      return { over: true, winner: 'civilians', reason: 'All bugs were fixed in time!' };
    }
    return { over: true, winner: 'impostor', reason: `The impostor survived all ${maxRounds} rounds!` };
  }
  return { over: false };
}

function evaluateVoteResult(room, eliminated) {
  if (!eliminated) return { over: false };

  if (eliminated.id === room.impostorId) {
    return { over: true, winner: 'civilians', reason: 'The impostor was caught and voted out!' };
  }

  const remainingAfter = room.players.filter((p) => p.id !== eliminated.id);
  // Account for multiple impostors
  const impostorCount = room.settings?.impostorCount || 1;
  if (remainingAfter.length <= impostorCount + 1) {
    return { over: true, winner: 'impostor', reason: 'The impostor outlasted the civilians!' };
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
  getRoundDuration,
  getMaxRounds,
  VOTE_DURATION,
  CATEGORY_VOTE_DURATION,
  evaluateRoundEnd,
  evaluateVoteResult,
  tallyVotes,
  pickWinningCategory,
};