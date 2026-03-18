// server/game/engine.js

const MAX_ROUNDS = 4;
const ROUND_DURATION = 60;
const VOTE_DURATION = 30;
const CATEGORY_VOTE_DURATION = 15;

function evaluateRoundEnd(room) {
  if (room.currentRound >= MAX_ROUNDS) {
    if ((room.testsPassed || 0) >= 3) {
      return { over: true, winner: 'civilians', reason: 'All bugs were fixed before round 4 ended!' };
    }
    return { over: true, winner: 'impostor', reason: 'The impostor survived all 4 rounds!' };
  }
  return { over: false };
}

// Call this BEFORE removing eliminated player from room.players
function evaluateVoteResult(room, eliminated) {
  if (!eliminated) return { over: false };

  if (eliminated.id === room.impostorId) {
    return { over: true, winner: 'civilians', reason: 'The impostor was caught and voted out!' };
  }

  const remainingAfter = room.players.filter((p) => p.id !== eliminated.id);
  if (remainingAfter.length <= 2) {
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
  MAX_ROUNDS, ROUND_DURATION, VOTE_DURATION, CATEGORY_VOTE_DURATION,
  evaluateRoundEnd, evaluateVoteResult, tallyVotes, pickWinningCategory,
};