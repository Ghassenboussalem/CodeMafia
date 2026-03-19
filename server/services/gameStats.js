const supabase = require('../lib/supabase');
const { calculateGameXp, calculateLevel } = require('../lib/xp');

/**
 * Called at the end of every game.
 * Updates stats, XP, and game history for all logged-in players.
 *
 * @param {object} gameData
 * @param {string} gameData.roomCode
 * @param {string} gameData.category
 * @param {string} gameData.winner  - 'civilians' | 'impostor'
 * @param {number} gameData.roundsPlayed
 * @param {Array}  gameData.players - [{ userId, role, won, testsPassed, sabotagesDone, wasEliminated, votesReceived }]
 */
async function recordGameEnd(gameData) {
  try {
    const { roomCode, category, winner, roundsPlayed, players } = gameData;

    // Only process players who have accounts (userId present)
    const loggedIn = players.filter((p) => p.userId);
    if (loggedIn.length === 0) return;

    // Create game history record
    const { data: game, error: gameError } = await supabase
      .from('game_history')
      .insert({
        room_code:    roomCode,
        category,
        winner,
        rounds_played: roundsPlayed,
        player_count:  players.length,
      })
      .select()
      .single();

    if (gameError) {
      console.error('[gameStats] Failed to create game history:', gameError);
      return;
    }

    // Process each logged-in player
    for (const p of loggedIn) {
      const xpEarned = calculateGameXp({
        role:          p.role,
        won:           p.won,
        testsPassed:   p.testsPassed || 0,
        sabotagesDone: p.sabotagesDone || 0,
        survived:      !p.wasEliminated,
      });

      // Insert game result
      await supabase.from('game_results').insert({
        game_id:       game.id,
        user_id:       p.userId,
        role:          p.role,
        won:           p.won,
        xp_earned:     xpEarned,
        tests_passed:  p.testsPassed || 0,
        was_eliminated: p.wasEliminated || false,
        votes_received: p.votesReceived || 0,
      });

      // Update cumulative stats
      await supabase.rpc('increment_stats', {
        p_user_id:             p.userId,
        p_games_played:        1,
        p_games_won:           p.won ? 1 : 0,
        p_games_lost:          p.won ? 0 : 1,
        p_times_impostor:      p.role === 'impostor' ? 1 : 0,
        p_times_impostor_won:  (p.role === 'impostor' && p.won) ? 1 : 0,
        p_times_caught:        (p.role === 'impostor' && !p.won) ? 1 : 0,
        p_tests_passed:        p.testsPassed || 0,
        p_sabotages_completed: p.sabotagesDone || 0,
        p_votes_received:      p.votesReceived || 0,
      });

      // Update XP
      const { data: current } = await supabase
        .from('user_xp')
        .select('xp, level')
        .eq('user_id', p.userId)
        .single();

      const newXp    = (current?.xp || 0) + xpEarned;
      const newLevel = calculateLevel(newXp);
      const leveledUp = newLevel > (current?.level || 1);

      await supabase
        .from('user_xp')
        .update({ xp: newXp, level: newLevel, updated_at: new Date().toISOString() })
        .eq('user_id', p.userId);

      console.log(`[gameStats] ${p.userId} earned ${xpEarned} XP (total: ${newXp}, level: ${newLevel}${leveledUp ? ' LEVEL UP!' : ''})`);
    }
  } catch (err) {
    console.error('[gameStats] Error recording game end:', err);
  }
}

module.exports = { recordGameEnd };