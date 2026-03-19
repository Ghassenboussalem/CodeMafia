const express = require('express');
const supabase = require('../lib/supabase');
const { attachUser, requireAuth } = require('../middleware/auth');
const { calculateLevel, xpToNextLevel } = require('../lib/xp');

const router = express.Router();

// ── Global Leaderboard ────────────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_xp')
      .select(`
        xp, level,
        users (id, username, tier, avatar_url, role)
      `)
      .order('xp', { ascending: false })
      .limit(50);

    if (error) throw error;

    const leaderboard = data.map((row, idx) => ({
      rank: idx + 1,
      userId: row.users.id,
      username: row.users.username,
      tier: row.users.tier,
      avatarUrl: row.users.avatar_url,
      role: row.users.role,
      xp: row.xp,
      level: row.level,
    }));

    res.json({ leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ── Public profile ────────────────────────────────────────────────────────
router.get('/profile/:username', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, tier, avatar_url, role, created_at')
      .eq('username', req.params.username)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    const [xpResult, statsResult] = await Promise.all([
      supabase.from('user_xp').select('*').eq('user_id', user.id).single(),
      supabase.from('user_stats').select('*').eq('user_id', user.id).single(),
    ]);

    const xp = xpResult.data;
    const stats = statsResult.data;

    res.json({
      user,
      xp: {
        total: xp?.xp || 0,
        level: xp?.level || 1,
        toNextLevel: xpToNextLevel(xp?.xp || 0),
      },
      stats: {
        gamesPlayed:        stats?.games_played || 0,
        gamesWon:           stats?.games_won || 0,
        winRate:            stats?.games_played
          ? Math.round((stats.games_won / stats.games_played) * 100)
          : 0,
        timesImpostor:      stats?.times_impostor || 0,
        impostorWinRate:    stats?.times_impostor
          ? Math.round((stats.times_impostor_won / stats.times_impostor) * 100)
          : 0,
        timesCaught:        stats?.times_caught || 0,
        testsPassed:        stats?.tests_passed || 0,
        sabotagesCompleted: stats?.sabotages_completed || 0,
        votesReceived:      stats?.votes_received || 0,
        fastestBugFixMs:    stats?.fastest_bug_fix_ms,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── My profile (private — includes email) ────────────────────────────────
router.get('/me/profile', attachUser, requireAuth, async (req, res) => {
  try {
    const [xpResult, statsResult, cosmeticsResult] = await Promise.all([
      supabase.from('user_xp').select('*').eq('user_id', req.user.id).single(),
      supabase.from('user_stats').select('*').eq('user_id', req.user.id).single(),
      supabase.from('user_cosmetics').select('*').eq('user_id', req.user.id),
    ]);

    const xp = xpResult.data;

    res.json({
      user: req.user,
      xp: {
        total: xp?.xp || 0,
        level: xp?.level || 1,
        toNextLevel: xpToNextLevel(xp?.xp || 0),
      },
      stats: statsResult.data,
      cosmetics: cosmeticsResult.data || [],
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── Update username ───────────────────────────────────────────────────────
router.patch('/me/username', attachUser, requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Letters, numbers and underscores only' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    await supabase.from('users').update({ username }).eq('id', req.user.id);
    res.json({ success: true, username });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update username' });
  }
});

module.exports = router;