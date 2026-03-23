require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const passport   = require('passport');

const { initRedis }           = require('./rooms/roomManager');
const registerLobbyEvents     = require('./events/lobbyEvents');
const registerGameEvents      = require('./events/gameEvents');
const registerVoteEvents      = require('./events/voteEvents');
const registerChatEvents      = require('./events/chatEvents');
const registerSabotageEvents  = require('./events/sabotageEvents');

const authRoutes   = require('./routes/auth');
const userRoutes   = require('./routes/users');
const stripeRoutes = require('./routes/stripe');
const { verifyToken } = require('./lib/jwt');

const PORT       = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const IS_PROD    = process.env.NODE_ENV === 'production';

const app = express();

const corsOptions = {
  origin: IS_PROD ? CLIENT_URL : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
};

app.use(cors(corsOptions));

// Stripe webhook needs raw body — must be before express.json()
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/webhooks', stripeRoutes);

app.use(express.json());
app.use(passport.initialize());

// ── REST Routes ───────────────────────────────────────────────────────────
app.use('/auth',   authRoutes);
app.use('/users',  userRoutes);
app.use('/stripe', stripeRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now(), env: process.env.NODE_ENV || 'development' });
});

// ── HTTP Server ───────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout:  30000,
  pingInterval: 10000,
});

// Attach userId to socket if a valid JWT is provided
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    const payload = verifyToken(token);
    if (payload) socket.userId = payload.userId;
  }
  next();
});

// ── Socket Event Handlers ─────────────────────────────────────────────────
function attachHandlers() {
  io.on('connection', (socket) => {
    console.log(`[+] ${socket.id}${socket.userId ? ` (user:${socket.userId})` : ''}`);

    registerLobbyEvents(io, socket);
    registerGameEvents(io, socket);
    registerVoteEvents(io, socket);
    registerChatEvents(io, socket);
    registerSabotageEvents(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[-] ${socket.id} (${reason})`);
    });
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 Code Mafia server :${PORT}`);
    console.log(`   CORS : ${IS_PROD ? CLIENT_URL : '*'}`);
    console.log(`   ENV  : ${process.env.NODE_ENV || 'development'}`);
  });
}

// ── Start ─────────────────────────────────────────────────────────────────
initRedis()
  .then(() => {
    console.log('✅ Redis connected');
    attachHandlers();
  })
  .catch((err) => {
    console.warn(`⚠️  Redis unavailable — ${err.message}`);
    console.warn('   Running with in-memory store');
    attachHandlers();
  });