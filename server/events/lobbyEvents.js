const {
  createRoom, getRoom, saveRoom, removeRoom,
  addPlayer, addSpectator, removeSpectator,
  removePlayer, markReady, unreadyAll,
  getPublicRooms, getRoomBySocketId, generateRejoinToken,
} = require('../rooms/roomManager');

const { CATEGORY_VOTE_DURATION } = require('../game/engine');
const { startRoundTimer, clearRoomTimers } = require('../game/roundTimer');

const reconnectTimers = new Map();
const disconnectedSlots = new Map();
const countdownTimers = new Map();
const REJOIN_WINDOW_MS = 60000;

module.exports = function registerLobbyEvents(io, socket) {

  // ── Server Browser ───────────────────────────────────────────────────
  socket.on('get_public_rooms', async () => {
    const rooms = await getPublicRooms();
    socket.emit('public_rooms', { rooms });
  });

  // ── Spectate Room ────────────────────────────────────────────────────
  socket.on('spectate_room', async ({ code, name } = {}) => {
    if (!code || !name?.trim()) {
      return socket.emit('error', { message: 'Name and code required' });
    }
    const result = await addSpectator(code.toUpperCase(), socket.id, name.trim().slice(0, 20));
    if (result.error) return socket.emit('error', { message: result.error });
    socket.join(code.toUpperCase());
    socket.emit('spectating', { room: result.room });
    // Tell others a spectator joined
    socket.to(code.toUpperCase()).emit('spectator_joined', {
      spectatorCount: (result.room.spectators || []).length,
    });
  });

  // ── Leave Spectate ───────────────────────────────────────────────────
  socket.on('leave_spectate', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room) return;
    const isSpectator = (room.spectators || []).find((s) => s.id === socket.id);
    if (!isSpectator) return;
    const updated = await removeSpectator(room.code, socket.id);
    socket.leave(room.code);
    if (updated) {
      socket.to(room.code).emit('spectator_left', {
        spectatorCount: (updated.spectators || []).length,
      });
    }
  });

  // ── Create Room ──────────────────────────────────────────────────────
  socket.on('create_room', async ({ name, settings } = {}) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });
    const room = await createRoom(socket.id, name.trim().slice(0, 20), settings || {});
    const me = room.players[0];
    socket.join(room.code);
    socket.emit('room_created', { room, rejoinToken: me.rejoinToken });
    // If public, broadcast updated room list to server browser
    if (room.settings.isPublic) broadcastPublicRooms(io);
  });

  // ── Join Room ────────────────────────────────────────────────────────
  socket.on('join_room', async ({ name, code } = {}) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });
    if (!code || code.length < 4) return socket.emit('error', { message: 'Invalid room code' });
    const result = await addPlayer(code.toUpperCase(), socket.id, name.trim().slice(0, 20));
    if (result.error) return socket.emit('error', { message: result.error });
    socket.join(code.toUpperCase());
    socket.emit('room_joined', { room: result.room, rejoinToken: result.rejoinToken });
    socket.to(code.toUpperCase()).emit('player_joined', { room: result.room });
    if (result.room.settings?.isPublic) broadcastPublicRooms(io);
  });

  // ── Rejoin Room ──────────────────────────────────────────────────────
  socket.on('rejoin_room', async ({ code, name, rejoinToken } = {}) => {
    if (!code || !name || !rejoinToken) {
      return socket.emit('error', { message: 'Missing rejoin details' });
    }
    const room = await getRoom(code.toUpperCase());
    if (!room) return socket.emit('rejoin_failed', { message: 'Room not found or game ended' });

    const slots = disconnectedSlots.get(code.toUpperCase()) || [];
    const slot = slots.find(
      (s) => s.name === name.trim() && s.rejoinToken === rejoinToken
    );
    if (!slot) return socket.emit('rejoin_failed', { message: 'Rejoin window expired or invalid token' });

    if (reconnectTimers.has(slot.id)) {
      clearTimeout(reconnectTimers.get(slot.id).timer);
      reconnectTimers.delete(slot.id);
    }
    disconnectedSlots.set(code.toUpperCase(), slots.filter((s) => s.name !== name.trim()));

    const oldId = slot.id;
    room.players.push({
      id: socket.id, name: slot.name, color: slot.color,
      colorName: slot.colorName, ready: true, rejoinToken: slot.rejoinToken,
    });
    if (room.impostorId === oldId) room.impostorId = socket.id;
    if (room.hostId === oldId) room.hostId = socket.id;
    if (room.disconnectedPlayers) {
      room.disconnectedPlayers = room.disconnectedPlayers.filter((id) => id !== oldId);
    }
    await saveRoom(room);
    socket.join(code.toUpperCase());
    socket.emit('rejoined', {
      room, role: room.impostorId === socket.id ? 'impostor' : 'civilian',
      currentRound: room.currentRound, category: room.chosenCategory,
      testsPassed: room.testsPassed || 0, sabotagesDone: room.sabotagesDone || 0,
    });
    socket.to(code.toUpperCase()).emit('player_rejoined', { room, name: slot.name });
    io.to(code.toUpperCase()).emit('message_received', {
      name: 'System', color: '#27ae60',
      text: `${slot.name} rejoined the game.`,
    });
  });

  // ── Update Room Settings (host only, lobby phase only) ───────────────
  socket.on('update_settings', async ({ settings } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'lobby') return;
    if (room.hostId !== socket.id) return;
    // Validate and clamp settings
    const safe = {};
    if (typeof settings.isPublic === 'boolean') safe.isPublic = settings.isPublic;
    if ([30, 60, 90].includes(settings.roundDuration)) safe.roundDuration = settings.roundDuration;
    if ([2, 4, 6].includes(settings.maxRounds)) safe.maxRounds = settings.maxRounds;
    if ([1, 2].includes(settings.impostorCount)) safe.impostorCount = settings.impostorCount;
    if (typeof settings.chatEnabled === 'boolean') safe.chatEnabled = settings.chatEnabled;
    if (typeof settings.spectatorAllowed === 'boolean') safe.spectatorAllowed = settings.spectatorAllowed;
    room.settings = { ...room.settings, ...safe };
    await saveRoom(room);
    io.to(room.code).emit('settings_updated', { settings: room.settings });
    if (room.settings.isPublic) broadcastPublicRooms(io);
  });

  // ── Player Ready ─────────────────────────────────────────────────────
  socket.on('player_ready', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'lobby') return;
    if (room.players.length < 3) return socket.emit('error', { message: 'Need at least 3 players' });
    const updated = await markReady(room.code, socket.id);
    io.to(room.code).emit('room_updated', { room: updated });
    if (updated.players.every((p) => p.ready)) startReadyCountdown(io, updated);
  });

  // ── Cancel Ready ─────────────────────────────────────────────────────
  socket.on('cancel_ready', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'lobby') return;
    if (countdownTimers.has(room.code)) {
      clearTimeout(countdownTimers.get(room.code));
      countdownTimers.delete(room.code);
    }
    const updated = await unreadyAll(room.code);
    io.to(room.code).emit('countdown_cancelled', { room: updated });
  });

  // ── Kick Player ──────────────────────────────────────────────────────
  socket.on('kick_player', async ({ targetId } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'lobby') return socket.emit('error', { message: 'Can only kick in lobby' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only host can kick' });
    if (targetId === socket.id) return socket.emit('error', { message: 'Cannot kick yourself' });
    const target = room.players.find((p) => p.id === targetId);
    if (!target) return;
    const updated = await removePlayer(room.code, targetId);
    io.to(targetId).emit('you_were_kicked', { name: target.name });
    if (updated) {
      io.to(room.code).emit('player_left', { room: updated, leftId: targetId });
      if (updated.settings?.isPublic) broadcastPublicRooms(io);
    }
  });

  // ── Leave Room ───────────────────────────────────────────────────────
  socket.on('leave_room', async () => handleLeave(io, socket, true));
  socket.on('disconnect', async () => {
    // Check if spectator first
    const room = await getRoomBySocketId(socket.id);
    if (room) {
      const isSpectator = (room.spectators || []).find((s) => s.id === socket.id);
      if (isSpectator) {
        await removeSpectator(room.code, socket.id);
        socket.to(room.code).emit('spectator_left', {
          spectatorCount: (room.spectators || []).length - 1,
        });
        return;
      }
    }
    handleLeave(io, socket, false);
  });
};

// ── Broadcast public rooms to all connected clients ──────────────────────

async function broadcastPublicRooms(io) {
  const rooms = await getPublicRooms();
  io.emit('public_rooms', { rooms });
}

// ── Ready Countdown ──────────────────────────────────────────────────────

function startReadyCountdown(io, room) {
  let count = 3;
  io.to(room.code).emit('countdown_start', { count });
  const tick = () => {
    count--;
    if (count > 0) {
      io.to(room.code).emit('countdown_tick', { count });
      countdownTimers.set(room.code, setTimeout(tick, 1000));
    } else {
      countdownTimers.delete(room.code);
      startCategoryVote(io, room);
    }
  };
  countdownTimers.set(room.code, setTimeout(tick, 1000));
}

// ── Disconnect / Leave Handler ───────────────────────────────────────────

async function handleLeave(io, socket, isVoluntary) {
  const room = await getRoomBySocketId(socket.id);
  if (!room) return;
  socket.leave(room.code);

  if (room.phase === 'lobby' || isVoluntary) {
    const updated = await removePlayer(room.code, socket.id);
    if (!updated) { clearRoomTimers(room.code); return; }
    io.to(room.code).emit('player_left', { room: updated, leftId: socket.id });
    if (updated.settings?.isPublic) broadcastPublicRooms(io);
    return;
  }

  const player = room.players.find((p) => p.id === socket.id);
  if (!player) return;

  if (!room.disconnectedPlayers) room.disconnectedPlayers = [];
  room.disconnectedPlayers.push(socket.id);
  await saveRoom(room);
  io.to(room.code).emit('player_disconnected', { playerId: socket.id, room });
  io.to(room.code).emit('message_received', {
    name: 'System', color: '#e67e22',
    text: `${player.name} disconnected. 60 seconds to rejoin...`,
  });

  const slots = disconnectedSlots.get(room.code) || [];
  slots.push({
    id: socket.id, name: player.name, color: player.color,
    colorName: player.colorName, rejoinToken: player.rejoinToken,
    disconnectedAt: Date.now(),
  });
  disconnectedSlots.set(room.code, slots);

  const evictionTimer = setTimeout(async () => {
    reconnectTimers.delete(socket.id);
    const current = await getRoom(room.code);
    if (!current) return;
    const s = disconnectedSlots.get(room.code) || [];
    disconnectedSlots.set(room.code, s.filter((x) => x.id !== socket.id));

    if (current.impostorId === socket.id) {
      io.to(room.code).emit('game_over', {
        winner: 'civilians', reason: 'The impostor disconnected and did not return!',
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
    io.to(room.code).emit('message_received', {
      name: 'System', color: '#c0392b',
      text: `${player.name} failed to rejoin and was removed.`,
    });
  }, REJOIN_WINDOW_MS);

  reconnectTimers.set(socket.id, { timer: evictionTimer, roomCode: room.code });
}

// ── Category Vote → Role Assignment ─────────────────────────────────────

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

  const shuffled = [...current.players].sort(() => Math.random() - 0.5);
  const impostorCount = current.settings?.impostorCount || 1;
  const impostors = shuffled.slice(0, impostorCount);
  // Store as array for multi-impostor support
  current.impostorIds = impostors.map((p) => p.id);
  // Keep impostorId for backwards compatibility
  current.impostorId = impostors[0].id;
  console.log(`[assignRoles] room=${room.code} impostors=${impostors.map((p) => p.name).join(', ')}`);

  current.phase = 'role_reveal';
  await saveRoom(current);

  current.players.forEach((p) => {
    const isImpostor = current.impostorIds.includes(p.id);
    io.to(p.id).emit('role_assigned', {
      role: isImpostor ? 'impostor' : 'civilian',
      // Impostors know each other when there are 2
      teammates: isImpostor && impostorCount > 1
        ? impostors.filter((imp) => imp.id !== p.id).map((imp) => imp.name)
        : [],
    });
  });

  setTimeout(async () => {
    const fresh = await getRoom(room.code);
    if (!fresh) return;
    Object.assign(fresh, {
      phase: 'game', currentRound: 1, testsPassed: 0, sabotagesDone: 0,
      emergencyUsedBy: [], votes: {}, disconnectedPlayers: [],
    });
    await saveRoom(fresh);
    io.to(room.code).emit('game_start', {
      category: fresh.chosenCategory,
      round: 1,
      settings: fresh.settings,
    });
    startRoundTimer(io, fresh);
  }, 4000);
}