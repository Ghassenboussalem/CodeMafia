require('dotenv').config();
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');

const { initRedis } = require('./rooms/roomManager');
const registerLobbyEvents = require('./events/lobbyEvents');
const registerGameEvents  = require('./events/gameEvents');
const registerVoteEvents  = require('./events/voteEvents');
const registerChatEvents  = require('./events/chatEvents');

const PORT       = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const IS_PROD    = process.env.NODE_ENV === 'production';

// ── Express setup ───────────────────────────────────────────────────────
const app = express();

// In production, only allow the known frontend origin
const corsOptions = {
  origin: IS_PROD ? CLIENT_URL : '*',
  methods: ['GET', 'POST'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check — used by Render/Railway uptime monitors
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now(), env: process.env.NODE_ENV || 'development' });
});

const server = http.createServer(app);

// ── Socket.IO setup ─────────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions,
  // Improve reliability for Render/Railway proxies
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 10000,
});

// ── Register socket handlers ─────────────────────────────────────────────
function attachHandlers() {
  io.on('connection', (socket) => {
    console.log(`[+] ${socket.id} connected  (total: ${io.engine.clientsCount})`);

    registerLobbyEvents(io, socket);
    registerGameEvents(io, socket);
    registerVoteEvents(io, socket);
    registerChatEvents(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[-] ${socket.id} disconnected (${reason})`);
    });
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 Code Mafia server running on :${PORT}`);
    console.log(`   CORS allowed origin: ${IS_PROD ? CLIENT_URL : '*'}`);
    console.log(`   Redis: ${process.env.REDIS_URL || 'not configured'}\n`);
  });
}

// ── Boot ─────────────────────────────────────────────────────────────────
initRedis()
  .then(() => {
    console.log('✅ Redis connected');
    attachHandlers();
  })
  .catch((err) => {
    console.warn(`⚠️  Redis unavailable (${err.message}) — using in-memory store`);
    attachHandlers();
  });
