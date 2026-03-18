const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const ROOM_TTL = 60 * 30; // 30 minutes in seconds
const COLORS = ['#c0392b', '#2980b9', '#27ae60', '#e67e22', '#8e44ad'];
const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Orange', 'Purple'];

let redisClient = null;
// In-memory fallback when Redis is unavailable
const memStore = new Map();

async function initRedis() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = createClient({ url });
  redisClient.on('error', (err) => console.error('Redis error:', err));
  await redisClient.connect();
}

// ─── Low-level store helpers ───────────────────────────────────────────────

async function storeRoom(code, room) {
  const json = JSON.stringify(room);
  if (redisClient?.isReady) {
    await redisClient.set(`room:${code}`, json, { EX: ROOM_TTL });
  } else {
    memStore.set(`room:${code}`, json);
  }
}

async function fetchRoom(code) {
  let json;
  if (redisClient?.isReady) {
    json = await redisClient.get(`room:${code}`);
  } else {
    json = memStore.get(`room:${code}`) || null;
  }
  return json ? JSON.parse(json) : null;
}

async function deleteRoom(code) {
  if (redisClient?.isReady) {
    await redisClient.del(`room:${code}`);
  } else {
    memStore.delete(`room:${code}`);
  }
}

// ─── Room code generation ──────────────────────────────────────────────────

function generateCode() {
  return uuidv4().replace(/-/g, '').toUpperCase().slice(0, 6);
}

// ─── Public API ───────────────────────────────────────────────────────────

async function createRoom(hostSocketId, hostName) {
  const code = generateCode();
  const room = {
    code,
    hostId: hostSocketId,
    phase: 'lobby',
    players: [
      {
        id: hostSocketId,
        name: hostName,
        color: COLORS[0],
        colorName: COLOR_NAMES[0],
        ready: false,
      },
    ],
    categoryVotes: {},
    chosenCategory: null,
    currentRound: 1,
    emergencyUsedBy: [],
    chatLog: [],
    createdAt: Date.now(),
  };
  await storeRoom(code, room);
  return room;
}

async function getRoom(code) {
  return fetchRoom(code);
}

async function saveRoom(room) {
  await storeRoom(room.code, room);
}

async function removeRoom(code) {
  await deleteRoom(code);
}

async function addPlayer(code, socketId, name) {
  const room = await fetchRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= 5) return { error: 'Room is full' };
  if (room.phase !== 'lobby') return { error: 'Game already in progress' };
  if (room.players.find((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return { error: 'Name already taken' };
  }

  const idx = room.players.length;
  room.players.push({
    id: socketId,
    name,
    color: COLORS[idx % COLORS.length],
    colorName: COLOR_NAMES[idx % COLOR_NAMES.length],
    ready: false,
  });
  await storeRoom(code, room);
  return { room };
}

async function removePlayer(code, socketId) {
  const room = await fetchRoom(code);
  if (!room) return null;

  room.players = room.players.filter((p) => p.id !== socketId);

  if (room.players.length === 0) {
    await deleteRoom(code);
    return null;
  }

  // Reassign host if needed
  if (room.hostId === socketId) {
    room.hostId = room.players[0].id;
  }

  await storeRoom(code, room);
  return room;
}

async function markReady(code, socketId) {
  const room = await fetchRoom(code);
  if (!room) return null;
  const player = room.players.find((p) => p.id === socketId);
  if (player) player.ready = true;
  await storeRoom(code, room);
  return room;
}

async function getRoomBySocketId(socketId) {
  // Scan all keys — only feasible for small scale / dev
  if (redisClient?.isReady) {
    const keys = await redisClient.keys('room:*');
    for (const key of keys) {
      const json = await redisClient.get(key);
      if (!json) continue;
      const room = JSON.parse(json);
      if (room.players.find((p) => p.id === socketId)) return room;
    }
    return null;
  } else {
    for (const json of memStore.values()) {
      const room = JSON.parse(json);
      if (room.players.find((p) => p.id === socketId)) return room;
    }
    return null;
  }
}

module.exports = {
  initRedis,
  createRoom,
  getRoom,
  saveRoom,
  removeRoom,
  addPlayer,
  removePlayer,
  markReady,
  getRoomBySocketId,
  COLORS,
  COLOR_NAMES,
};
