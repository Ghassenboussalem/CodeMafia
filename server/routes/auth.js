const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const supabase = require('../lib/supabase');
const { signToken } = require('../lib/jwt');
const { attachUser, requireAuth } = require('../middleware/auth');

const router = express.Router();

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email from Google'));

      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', profile.id)
        .single();

      let isNewUser = false;

      if (!user) {
        let { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (existing) {
          // Link Google to existing email account
          await supabase
            .from('users')
            .update({
              google_id: profile.id,
              avatar_url: profile.photos?.[0]?.value,
            })
            .eq('id', existing.id);
          user = { ...existing, google_id: profile.id };
        } else {
          // New user — create with temporary username, mark as incomplete
          const tempUsername = await generateUniqueUsername(
            (profile.displayName?.replace(/\s+/g, '') || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '')
          );

          const { data: newUser, error } = await supabase
            .from('users')
            .insert({
              email,
              username: tempUsername,
              google_id: profile.id,
              avatar_url: profile.photos?.[0]?.value,
              role: 'player',
              tier: 'free',
              // Mark profile as incomplete so client shows setup screen
              profile_complete: false,
            })
            .select()
            .single();

          if (error) return done(error);

          await supabase.from('user_xp').insert({ user_id: newUser.id, xp: 0, level: 1 });
          await supabase.from('user_stats').insert({ user_id: newUser.id });

          user = newUser;
          isNewUser = true;
        }
      }

      // Attach flag so callback route knows
      user._isNewUser = isNewUser;
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// ── Register ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, role = 'player' } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password and username are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers and underscores' });
    }

    const validRoles = ['player', 'teacher', 'developer', 'educator'];
    const safeRole = validRoles.includes(role) ? role : 'player';

    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });

    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    if (existingUsername) return res.status(400).json({ error: 'Username already taken' });

    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
    .from('users')
    .insert({
        email: email.toLowerCase(),
        username,
        password_hash,
        role: safeRole,
        tier: 'free',
        profile_complete: true,
        show_tutorial: true,   // ← new
    })
    .select('id, email, username, role, tier, avatar_url, profile_complete, show_tutorial')
    .single();

    if (error) throw error;

    await supabase.from('user_xp').insert({ user_id: user.id, xp: 0, level: 1 });
    await supabase.from('user_stats').insert({ user_id: user.id });

    const token = signToken({ userId: user.id });
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, role, tier, avatar_url, password_hash, profile_complete')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google login' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id);

    const token = signToken({ userId: user.id });
    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── Google OAuth ──────────────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/?auth_error=oauth_failed`,
  }),
  (req, res) => {
    const token = signToken({ userId: req.user.id });
    const isNew = req.user._isNewUser ? '&new_user=1' : '';
    // Redirect to frontend HOME page with token as query param
    // Use query param instead of hash so Vercel routing works
    res.redirect(`${process.env.CLIENT_URL}/?auth_token=${token}${isNew}`);
  }
);

// ── Complete Google profile (username + role) ────────────────────────────
router.post('/complete-profile', attachUser, requireAuth, async (req, res) => {
  try {
    const { username, role } = req.body;

    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Letters, numbers and underscores only' });
    }

    const validRoles = ['player', 'teacher', 'developer', 'educator'];
    const safeRole = validRoles.includes(role) ? role : 'player';

    // Check username not taken by someone else
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const { data: updated } = await supabase
    .from('users')
    .update({
        username,
        role: safeRole,
        profile_complete: true,
        show_tutorial: true,   // ← new
    })
    .eq('id', req.user.id)
    .select('id, email, username, role, tier, avatar_url, profile_complete, show_tutorial')
    .single();

    res.json({ user: updated });
  } catch (err) {
    console.error('Complete profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── Get current user ──────────────────────────────────────────────────────
router.get('/me', attachUser, requireAuth, async (req, res) => {
  try {
    const [xpResult, statsResult] = await Promise.all([
      supabase.from('user_xp').select('*').eq('user_id', req.user.id).single(),
      supabase.from('user_stats').select('*').eq('user_id', req.user.id).single(),
    ]);

    // Also fetch profile_complete from users
    const { data: fullUser } = await supabase
    .from('users')
    .select('id, email, username, role, tier, avatar_url, profile_complete, show_tutorial')
    .eq('id', req.user.id)
    .single();

    res.json({
      user: fullUser || req.user,
      xp: xpResult.data,
      stats: statsResult.data,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── Logout ────────────────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  res.json({ success: true });
});

router.post('/dismiss-tutorial', attachUser, requireAuth, async (req, res) => {
  await supabase
    .from('users')
    .update({ show_tutorial: false })
    .eq('id', req.user.id);
  res.json({ success: true });
});

// ── Helper ────────────────────────────────────────────────────────────────
async function generateUniqueUsername(base) {
  const clean = (base || 'player').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'player';
  let username = clean;
  let attempt = 0;
  while (true) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();
    if (!data) return username;
    attempt++;
    username = `${clean}${attempt}`;
  }
}

module.exports = router;