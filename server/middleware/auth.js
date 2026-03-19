const { verifyToken } = require('../lib/jwt');
const supabase = require('../lib/supabase');

// Middleware — attaches req.user if token is valid
// Does NOT block the request if no token (use requireAuth for that)
async function attachUser(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = header.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      req.user = null;
      return next();
    }

    // Fetch fresh user from DB
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, role, tier, avatar_url')
      .eq('id', payload.userId)
      .single();

    if (error || !user) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch {
    req.user = null;
    next();
  }
}

// Middleware — blocks if not authenticated
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Middleware — blocks if not Pro tier
function requirePro(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.tier !== 'pro') {
    return res.status(403).json({ error: 'Pro subscription required' });
  }
  next();
}

module.exports = { attachUser, requireAuth, requirePro };