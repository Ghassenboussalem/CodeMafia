// server/events/lobbyEvents.js

const {
  createRoom, getRoom, saveRoom, removeRoom,
  addPlayer, removePlayer, markReady, getRoomBySocketId,
} = require('../rooms/roomManager');

const { CATEGORY_VOTE_DURATION } = require('../game/engine');
const { startRoundTimer, clearRoomTimers } = require('../game/roundTimer');

const reconnectTimers = new Map();
const disconnectedSlots = new Map();

module.exports = function registerLobbyEvents(io, socket) {

  socket.on('create_room', async ({ name } = {}) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });
    const room = await createRoom(socket.id, name.trim().slice(0, 20));
    socket.join(room.code);
    socket.emit('room_created', { room });
  });

  socket.on('join_room', async ({ name, code } = {}) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });
    if (!code || code.length < 4) return socket.emit('error', { message: 'Invalid room code' });
    const result = await addPlayer(code.toUpperCase(), socket.id, name.trim().slice(0, 20));
    if (result.error) return socket.emit('error', { message: result.error });
    socket.join(code.toUpperCase());
    socket.emit('room_joined', { room: result.room });
    socket.to(code.toUpperCase()).emit('player_joined', { room: result.room });
  });

  socket.on('reconnect_room', async ({ code, name } = {}) => {
    if (!code || !name) return socket.emit('error', { message: 'Missing code or name' });
    const room = await getRoom(code.toUpperCase());
    if (!room) return socket.emit('error', { message: 'Room not found or expired' });

    const slots = disconnectedSlots.get(code.toUpperCase()) || [];
    const slot = slots.find((s) => s.name === name.trim());
    if (!slot) return socket.emit('error', { message: 'No reconnect slot found' });

    if (reconnectTimers.has(slot.id)) {
      clearTimeout(reconnectTimers.get(slot.id).timer);
      reconnectTimers.delete(slot.id);
    }

    disconnectedSlots.set(code.toUpperCase(), slots.filter((s) => s.name !== name.trim()));

    const oldId = slot.id;
    room.players.push({
      id: socket.id, name: slot.name, color: slot.color,
      colorName: slot.colorName, ready: true,
    });
    if (room.impostorId === oldId) room.impostorId = socket.id;
    if (room.hostId === oldId) room.hostId = socket.id;
    await saveRoom(room);

    socket.join(code.toUpperCase());
    socket.emit('reconnected', {
      room,
      role: room.impostorId === socket.id ? 'impostor' : 'civilian',
      currentRound: room.currentRound,
      category: room.chosenCategory,
    });
    socket.to(code.toUpperCase()).emit('player_reconnected', { room });
  });

  socket.on('player_ready', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'lobby') return;
    if (room.players.length < 3) return socket.emit('error', { message: 'Need at least 3 players' });
    const updated = await markReady(room.code, socket.id);
    io.to(room.code).emit('room_updated', { room: updated });
    if (updated.players.every((p) => p.ready)) startCategoryVote(io, updated);
  });

  socket.on('leave_room', async () => handleLeave(io, socket, true));
  socket.on('disconnect', async () => handleLeave(io, socket, false));
};

async function handleLeave(io, socket, isVoluntary) {
  const room = await getRoomBySocketId(socket.id);
  if (!room) return;
  socket.leave(room.code);

  if (room.phase === 'lobby' || isVoluntary) {
    const updated = await removePlayer(room.code, socket.id);
    if (!updated) { clearRoomTimers(room.code); return; }
    io.to(room.code).emit('player_left', { room: updated, leftId: socket.id });
    return;
  }

  const player = room.players.find((p) => p.id === socket.id);
  if (!player) return;

  if (!room.disconnectedPlayers) room.disconnectedPlayers = [];
  room.disconnectedPlayers.push(socket.id);
  await saveRoom(room);
  io.to(room.code).emit('player_disconnected', { playerId: socket.id, room });

  const slots = disconnectedSlots.get(room.code) || [];
  slots.push({ id: socket.id, name: player.name, color: player.color, colorName: player.colorName });
  disconnectedSlots.set(room.code, slots);

  const evictionTimer = setTimeout(async () => {
    reconnectTimers.delete(socket.id);
    const current = await getRoom(room.code);
    if (!current) return;

    const s = disconnectedSlots.get(room.code) || [];
    disconnectedSlots.set(room.code, s.filter((x) => x.id !== socket.id));

    if (current.impostorId === socket.id) {
      io.to(room.code).emit('game_over', {
        winner: 'civilians', reason: 'The impostor disconnected!',
        impostorId: socket.id, impostorName: player.name, impostorColor: player.color,
      });
      clearRoomTimers(room.code);
      await removeRoom(room.code);
      return;
    }

    const updated = await removePlayer(room.code, socket.id);
    if (!updated) { clearRoomTimers(room.code); return; }

    if (['game', 'voting_players', 'emergency'].includes(updated.phase) && updated.players.length < 2) {
      io.to(room.code).emit('game_abandoned', { message: 'Not enough players to continue.' });
      clearRoomTimers(room.code);
      await removeRoom(room.code);
      return;
    }

    io.to(room.code).emit('player_left', { room: updated, leftId: socket.id });
  }, 15000);

  reconnectTimers.set(socket.id, { timer: evictionTimer, roomCode: room.code });
}

function startCategoryVote(io, room) {
  const CATEGORIES = [
    'Data Structures & Algorithms', 'Object-Oriented Programming',
    'Security', 'Front-End', 'Back-End',
  ];
  room.phase = 'voting_category';
  room.categoryVotes = {};
  room.categoryVoters = {};
  CATEGORIES.forEach((c) => (room.categoryVotes[c] = 0));
  saveRoom(room);
  io.to(room.code).emit('vote_start', { categories: CATEGORIES, duration: CATEGORY_VOTE_DURATION });

  let seconds = CATEGORY_VOTE_DURATION;
  const timer = setInterval(async () => {
    seconds--;
    io.to(room.code).emit('vote_tick', { seconds });
    if (seconds <= 0) {
      clearInterval(timer);
      const current = await getRoom(room.code);
      if (!current) return;
      const { pickWinningCategory } = require('../game/engine');
      const winner = pickWinningCategory(current.categoryVotes);
      current.chosenCategory = winner;
      current.phase = 'assigning';
      await saveRoom(current);
      io.to(room.code).emit('vote_end', { winner });
      setTimeout(() => assignRoles(io, current), 2500);
    }
  }, 1000);
}

async function assignRoles(io, room) {
  const current = await getRoom(room.code);
  if (!current) return;

  // Shuffle players array so impostor selection is not biased by join order
  const shuffled = [...current.players].sort(() => Math.random() - 0.5);
  current.impostorId = shuffled[0].id;
  console.log(`[assignRoles] room=${room.code} impostor=${shuffled[0].name}`);

  current.phase = 'role_reveal';
  await saveRoom(current);

  current.players.forEach((p) =>
    io.to(p.id).emit('role_assigned', {
      role: p.id === current.impostorId ? 'impostor' : 'civilian',
    })
  );

  setTimeout(async () => {
    const fresh = await getRoom(room.code);
    if (!fresh) return;
    Object.assign(fresh, {
      phase: 'game', currentRound: 1, testsPassed: 0, sabotagesDone: 0,
      emergencyUsedBy: [], votes: {}, disconnectedPlayers: [],
    });
    await saveRoom(fresh);
    io.to(room.code).emit('game_start', { category: fresh.chosenCategory, round: 1 });
    startRoundTimer(io, fresh);
  }, 4000);
}