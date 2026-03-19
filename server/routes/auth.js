const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const supabase = require('../lib/supabase');
const { signToken } = require('../lib/jwt');
const { attachUser, requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Configure Passport Google Strategy ──────────────────────────────────
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

      // Check if user exists by google_id
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', profile.id)
        .single();

      if (!user) {
        // Check by email (they may have registered with email before)
        let { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (existing) {
          // Link Google to existing account
          await supabase
            .from('users')
            .update({ google_id: profile.id, avatar_url: profile.photos?.[0]?.value })
            .eq('id', existing.id);
          user = { ...existing, google_id: profile.id };
        } else {
          // Create new user
          const username = await generateUniqueUsername(
            profile.displayName?.replace(/\s+/g, '') || email.split('@')[0]
          );

          const { data: newUser, error } = await supabase
            .from('users')
            .insert({
              email,
              username,
              google_id: profile.id,
              avatar_url: profile.photos?.[0]?.value,
              role: 'player',
              tier: 'free',
            })
            .select()
            .single();

          if (error) return done(error);

          // Create XP and stats records
          await supabase.from('user_xp').insert({ user_id: newUser.id, xp: 0, level: 1 });
          await supabase.from('user_stats').insert({ user_id: newUser.id });

          user = newUser;
        }
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// ── Register ─────────────────────────────────────────────────────────────
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

    // Check email taken
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });

    // Check username taken
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
      })
      .select('id, email, username, role, tier, avatar_url')
      .single();

    if (error) throw error;

    // Init XP and stats
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
      .select('id, email, username, role, tier, avatar_url, password_hash')
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

    // Update last_seen
    await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id);

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
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed` }),
  (req, res) => {
    const token = signToken({ userId: req.user.id });
    // Redirect to frontend with token in URL hash — client picks it up
    res.redirect(`${process.env.CLIENT_URL}/auth/callback#token=${token}`);
  }
);

// ── Get current user ──────────────────────────────────────────────────────
router.get('/me', attachUser, requireAuth, async (req, res) => {
  try {
    // Fetch full profile including XP and stats
    const [xpResult, statsResult] = await Promise.all([
      supabase.from('user_xp').select('*').eq('user_id', req.user.id).single(),
      supabase.from('user_stats').select('*').eq('user_id', req.user.id).single(),
    ]);

    res.json({
      user: req.user,
      xp: xpResult.data,
      stats: statsResult.data,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── Logout ────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  // JWT is stateless — client just deletes the token
  // We just confirm
  res.json({ success: true });
});

// ── Helper ────────────────────────────────────────────────────────────────
async function generateUniqueUsername(base) {
  const clean = base.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'player';
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