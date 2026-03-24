const {
  createRoom, getRoom, saveRoom, removeRoom,
  addPlayer, addSpectator, removeSpectator,
  removePlayer, markReady, unreadyAll,
  getPublicRooms, getRoomBySocketId, generateRejoinToken,
} = require('../rooms/roomManager');

const { CATEGORY_VOTE_DURATION } = require('../game/engine');
const { startGameTimer, clearGameTimer } = require('../game/gameTimer');
const { getChallengeForCategory } = require('../game/challenges');
const { getHintsForChallenge } = require('../game/challengeHints');
const { addBotsToRoom, startBotTick } = require('../game/botManager');

const reconnectTimers = new Map();
const disconnectedSlots = new Map();
const countdownTimers = new Map();
const REJOIN_WINDOW_MS = 60000;

module.exports = function registerLobbyEvents(io, socket) {

  socket.on('get_public_rooms', async () => {
    const rooms = await getPublicRooms();
    socket.emit('public_rooms', { rooms });
  });

  socket.on('spectate_room', async ({ code, name } = {}) => {
    if (!code || !name?.trim()) return socket.emit('error', { message: 'Name and code required' });
    const result = await addSpectator(code.toUpperCase(), socket.id, name.trim().slice(0, 20));
    if (result.error) return socket.emit('error', { message: result.error });
    socket.join(code.toUpperCase());
    socket.emit('spectating', { room: result.room });
    socket.to(code.toUpperCase()).emit('spectator_joined', {
      spectatorCount: (result.room.spectators || []).length,
    });
  });

  socket.on('leave_spectate', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room) return;
    const isSpectator = (room.spectators || []).find((s) => s.id === socket.id);
    if (!isSpectator) return;
    await removeSpectator(room.code, socket.id);
    socket.leave(room.code);
  });

  socket.on('create_room', async ({ name, settings } = {}) => {
    if (!name || !name.trim()) return socket.emit('error', { message: 'Name is required' });
    const room = await createRoom(socket.id, name.trim().slice(0, 20), settings || {});
    const me = room.players[0];
    socket.join(room.code);
    socket.emit('room_created', { room, rejoinToken: me.rejoinToken });
    if (room.settings.isPublic) broadcastPublicRooms(io);
  });

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

  // ── Character customization ──────────────────────────────────────────────
  socket.on('set_character', async ({ suitColor, visorColor, hat } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    player.character = { suitColor, visorColor, hat };
    await saveRoom(room);
    io.to(room.code).emit('room_updated', { room });
  });

  socket.on('rejoin_room', async ({ code, name, rejoinToken } = {}) => {
    if (!code || !name || !rejoinToken) return socket.emit('error', { message: 'Missing rejoin details' });
    const room = await getRoom(code.toUpperCase());
    if (!room) return socket.emit('rejoin_failed', { message: 'Room not found' });
    const slots = disconnectedSlots.get(code.toUpperCase()) || [];
    const slot = slots.find((s) => s.name === name.trim() && s.rejoinToken === rejoinToken);
    if (!slot) return socket.emit('rejoin_failed', { message: 'Rejoin window expired' });
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
    const challenge = getChallengeForCategory(room.chosenCategory);
    socket.emit('rejoined', {
      room,
      role: room.impostorId === socket.id ? 'impostor' : 'civilian',
      category: room.chosenCategory,
      testsPassed: room.testsPassed || 0,
      currentCode: room.currentCode || [...challenge.code],
      lineAuthors: room.lineAuthors || {},
      lineVersions: room.lineVersions || {},
      secondsLeft: room.gameSecondsLeft || 480,
    });
    socket.to(code.toUpperCase()).emit('player_rejoined', { room, name: slot.name });
    io.to(code.toUpperCase()).emit('message_received', {
      name: 'System', color: '#27ae60',
      text: `${slot.name} rejoined the session.`,
    });
  });

  socket.on('update_settings', async ({ settings } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'lobby' || room.hostId !== socket.id) return;
    const safe = {};
    if (typeof settings.isPublic === 'boolean') safe.isPublic = settings.isPublic;
    if (typeof settings.chatEnabled === 'boolean') safe.chatEnabled = settings.chatEnabled;
    if (typeof settings.spectatorAllowed === 'boolean') safe.spectatorAllowed = settings.spectatorAllowed;
    if ([1, 2].includes(settings.impostorCount)) safe.impostorCount = settings.impostorCount;
    room.settings = { ...room.settings, ...safe };
    await saveRoom(room);
    io.to(room.code).emit('settings_updated', { settings: room.settings });
    if (room.settings.isPublic) broadcastPublicRooms(io);
  });

  socket.on('player_ready', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'lobby') return;
    // Minimum 1 real player — bots fill the rest
    if (room.players.filter((p) => !p.isBot).length < 1) {
      return socket.emit('error', { message: 'Need at least 1 player' });
    }

    // Inject bots if fewer than 3 total players
    const realCount = room.players.filter((p) => !p.isBot).length;
    if (realCount < 3 && room.players.length < 3) {
      const botsNeeded = 3 - room.players.length;
      addBotsToRoom(room, botsNeeded);
      await saveRoom(room);
      // Let everyone in the room see the updated player list (including bots)
      io.to(room.code).emit('room_updated', { room });
    }

    const updated = await markReady(room.code, socket.id);
    // Also mark all bots as ready
    updated.players.filter((p) => p.isBot).forEach((b) => (b.ready = true));
    await saveRoom(updated);
    io.to(room.code).emit('room_updated', { room: updated });
    if (updated.players.every((p) => p.ready)) startReadyCountdown(io, updated);
  });

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

  socket.on('kick_player', async ({ targetId } = {}) => {
    const room = await getRoomBySocketId(socket.id);
    if (!room || room.phase !== 'lobby') return socket.emit('error', { message: 'Can only kick in lobby' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only host can kick' });
    if (targetId === socket.id) return;
    const target = room.players.find((p) => p.id === targetId);
    if (!target) return;
    const updated = await removePlayer(room.code, targetId);
    io.to(targetId).emit('you_were_kicked', { name: target.name });
    if (updated) {
      io.to(room.code).emit('player_left', { room: updated, leftId: targetId });
      if (updated.settings?.isPublic) broadcastPublicRooms(io);
    }
  });

  socket.on('leave_room', async () => handleLeave(io, socket, true));
  socket.on('disconnect', async () => {
    const room = await getRoomBySocketId(socket.id);
    if (room) {
      const isSpectator = (room.spectators || []).find((s) => s.id === socket.id);
      if (isSpectator) {
        await removeSpectator(room.code, socket.id);
        socket.to(room.code).emit('spectator_left', {
          spectatorCount: Math.max(0, (room.spectators || []).length - 1),
        });
        return;
      }
    }
    handleLeave(io, socket, false);
  });
};

async function broadcastPublicRooms(io) {
  const rooms = await getPublicRooms();
  io.emit('public_rooms', { rooms });
}

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

async function handleLeave(io, socket, isVoluntary) {
  const room = await getRoomBySocketId(socket.id);
  if (!room) return;
  socket.leave(room.code);

  if (room.phase === 'lobby' || isVoluntary) {
    const updated = await removePlayer(room.code, socket.id);
    if (!updated) { clearGameTimer(room.code); return; }
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
        winner: 'civilians', reason: 'The impostor disconnected!',
        impostorId: socket.id, impostorName: player.name, impostorColor: player.color,
      });
      clearGameTimer(room.code);
      await removeRoom(room.code);
      return;
    }

    const updated = await removePlayer(room.code, socket.id);
    if (!updated) { clearGameTimer(room.code); return; }

    if (['game', 'voting_players', 'emergency'].includes(updated.phase) && updated.players.length < 2) {
      io.to(room.code).emit('game_abandoned', { message: 'Not enough players to continue.' });
      clearGameTimer(room.code);
      await removeRoom(room.code);
      return;
    }

    io.to(room.code).emit('player_left', { room: updated, leftId: socket.id });
    io.to(room.code).emit('message_received', {
      name: 'System', color: '#c0392b',
      text: `${player.name} failed to reconnect and was removed.`,
    });
  }, REJOIN_WINDOW_MS);

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

  const shuffled = [...current.players].sort(() => Math.random() - 0.5);
  const impostorCount = current.settings?.impostorCount || 1;
  const impostors = shuffled.slice(0, impostorCount);
  current.impostorIds = impostors.map((p) => p.id);
  current.impostorId  = impostors[0].id;
  console.log(`[assignRoles] room=${room.code} impostors=${impostors.map((p) => p.name).join(', ')}`);

  current.phase = 'role_reveal';
  await saveRoom(current);

  current.players.forEach((p) => {
    const isImpostor = current.impostorIds.includes(p.id);
    const challenge  = getChallengeForCategory(current.chosenCategory);
    const allHints   = getHintsForChallenge(challenge.id);

    // Build fix hints for everyone (impostor gets same hints as civilians)
    const fixHints = allHints.map((h, i) => ({
      testName: challenge.tests[i]?.name || '',
      ...h.fix,
    }));

    io.to(p.id).emit('role_assigned', {
      role:          isImpostor ? 'impostor' : 'civilian',
      teammates:     isImpostor && impostorCount > 1
        ? impostors.filter((i) => i.id !== p.id).map((i) => i.name)
        : [],
      impostorGoals: isImpostor ? challenge.impostorGoals : [],
      // Impostor gets same fix hints as civilians (stealth — they must figure out sabotage)
      sabotageHints: [],
      // Sabotage powers definition (only meaningful for impostor, but sent to all for UI)
      sabotagePowers: isImpostor ? [
        { type: 'lights_out', name: 'Lights Out',   icon: '⚡', cooldown: 90,  duration: 20, desc: 'Civilians can only see around their cursor' },
        { type: 'quiz',       name: 'Quiz Bomb',    icon: '🧩', cooldown: 120, duration: 15, desc: 'Freeze everyone with a pop quiz' },
        { type: 'shuffle',    name: 'Code Shuffle', icon: '🔀', cooldown: 90,  duration: 25, desc: 'Scramble hint line numbers' },
      ] : [],
    });
  });

  setTimeout(async () => {
    const fresh = await getRoom(room.code);
    if (!fresh) return;
    const challenge = getChallengeForCategory(fresh.chosenCategory);
    Object.assign(fresh, {
      phase:           'game',
      testsPassed:     0,
      maxTestsPassed:  0,
      emergencyUsedBy: [],
      votes:           {},
      disconnectedPlayers: [],
      currentCode:     [...challenge.code],
      lineAuthors:     {},
      lineVersions:    {},
      gameSecondsLeft: 480,
    });
    await saveRoom(fresh);

    const allHints = getHintsForChallenge(challenge.id);
    const fixHints = allHints.map((h, i) => ({
      testName: challenge.tests[i]?.name || '',
      line:     h.fix.line,
      hint:     h.fix.hint,
      code:     h.fix.code,
    }));

    io.to(room.code).emit('game_start', {
      category:    fresh.chosenCategory,
      code:        fresh.currentCode,
      lineVersions: {},
      duration:    480,
      sections:    challenge.sections,
      testNames:   challenge.tests.map((t) => ({ name: t.name, section: t.section })),
      settings:    fresh.settings,
      language:    challenge.language,
      title:       challenge.title,
      description: challenge.description,
      fixHints,
      // Issue 6: Include full player list so in-game UI has character data
      players: fresh.players.map((p) => ({
        id:        p.id,
        name:      p.name,
        color:     p.color,
        colorName: p.colorName,
        character: p.character || null,
        isBot:     p.isBot || false,
        ready:     p.ready || false,
      })),
    });

    // Start bot AI tick (no-op if no bots)
    startBotTick(io, fresh);
    startGameTimer(io, fresh);
  }, 4000);
}