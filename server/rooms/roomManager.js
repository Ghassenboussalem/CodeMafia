const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const ROOM_TTL = 60 * 60;
const COLORS = ['#c0392b', '#2980b9', '#27ae60', '#e67e22', '#8e44ad'];
const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Orange', 'Purple'];

let redisClient = null;
const memStore = new Map();

async function initRedis() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = createClient({ url });
  redisClient.on('error', (err) => console.error('Redis error:', err));
  await redisClient.connect();
}

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

function generateCode() {
  return uuidv4().replace(/-/g, '').toUpperCase().slice(0, 6);
}

function generateRejoinToken() {
  return uuidv4().replace(/-/g, '');
}

// Default game settings
const DEFAULT_SETTINGS = {
  isPublic: false,
  roundDuration: 60,   // 30 | 60 | 90
  maxRounds: 4,        // 2 | 4 | 6
  impostorCount: 1,    // 1 | 2
  chatEnabled: true,
  spectatorAllowed: true,
};

async function createRoom(hostSocketId, hostName, settings = {}) {
  const code = generateCode();
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  const room = {
    code,
    hostId: hostSocketId,
    phase: 'lobby',
    settings: mergedSettings,
    players: [
      {
        id: hostSocketId,
        name: hostName,
        color: COLORS[0],
        colorName: COLOR_NAMES[0],
        ready: false,
        rejoinToken: generateRejoinToken(),
      },
    ],
    spectators: [],
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
  const rejoinToken = generateRejoinToken();
  room.players.push({
    id: socketId,
    name,
    color: COLORS[idx % COLORS.length],
    colorName: COLOR_NAMES[idx % COLOR_NAMES.length],
    ready: false,
    rejoinToken,
  });
  await storeRoom(code, room);
  return { room, rejoinToken };
}

async function addSpectator(code, socketId, name) {
  const room = await fetchRoom(code);
  if (!room) return { error: 'Room not found' };
  if (!room.settings?.spectatorAllowed) return { error: 'Spectators not allowed in this room' };
  if (!room.settings?.isPublic && room.phase === 'lobby') {
    return { error: 'This room is private' };
  }
  // Remove if already spectating
  room.spectators = (room.spectators || []).filter((s) => s.id !== socketId);
  room.spectators.push({ id: socketId, name });
  await storeRoom(code, room);
  return { room };
}

async function removeSpectator(code, socketId) {
  const room = await fetchRoom(code);
  if (!room) return null;
  room.spectators = (room.spectators || []).filter((s) => s.id !== socketId);
  await storeRoom(code, room);
  return room;
}

async function removePlayer(code, socketId) {
  const room = await fetchRoom(code);
  if (!room) return null;
  room.players = room.players.filter((p) => p.id !== socketId);
  if (room.players.length === 0) {
    await deleteRoom(code);
    return null;
  }
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

async function unreadyAll(code) {
  const room = await fetchRoom(code);
  if (!room) return null;
  room.players.forEach((p) => (p.ready = false));
  await storeRoom(code, room);
  return room;
}

// Get all public rooms for the server browser
async function getPublicRooms() {
  const rooms = [];
  if (redisClient?.isReady) {
    const keys = await redisClient.keys('room:*');
    for (const key of keys) {
      const json = await redisClient.get(key);
      if (!json) continue;
      const room = JSON.parse(json);
      if (room.settings?.isPublic) rooms.push(sanitizeRoomForBrowser(room));
    }
  } else {
    for (const json of memStore.values()) {
      const room = JSON.parse(json);
      if (room.settings?.isPublic) rooms.push(sanitizeRoomForBrowser(room));
    }
  }
  return rooms;
}

// Only send safe fields to the browser — never send tokens or impostor id
function sanitizeRoomForBrowser(room) {
  return {
    code: room.code,
    phase: room.phase,
    playerCount: room.players.length,
    maxPlayers: 5,
    spectatorCount: (room.spectators || []).length,
    chosenCategory: room.chosenCategory,
    currentRound: room.currentRound,
    settings: room.settings,
    hostName: room.players[0]?.name || '???',
    createdAt: room.createdAt,
  };
}

async function getRoomBySocketId(socketId) {
  if (redisClient?.isReady) {
    const keys = await redisClient.keys('room:*');
    for (const key of keys) {
      const json = await redisClient.get(key);
      if (!json) continue;
      const room = JSON.parse(json);
      if (
        room.players.find((p) => p.id === socketId) ||
        (room.spectators || []).find((s) => s.id === socketId)
      ) return room;
    }
    return null;
  } else {
    for (const json of memStore.values()) {
      const room = JSON.parse(json);
      if (
        room.players.find((p) => p.id === socketId) ||
        (room.spectators || []).find((s) => s.id === socketId)
      ) return room;
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
  addSpectator,
  removeSpectator,
  removePlayer,
  markReady,
  unreadyAll,
  getPublicRooms,
  getRoomBySocketId,
  generateRejoinToken,
  DEFAULT_SETTINGS,
  COLORS,
  COLOR_NAMES,
};