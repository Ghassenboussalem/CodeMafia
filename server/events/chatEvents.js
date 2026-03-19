const { getRoomBySocketId } = require('../rooms/roomManager');

const lastMessage = new Map();
const RATE_LIMIT_MS = 1000;
const BLOCKED_PHASES = ['assigning', 'role_reveal'];

module.exports = function registerChatEvents(io, socket) {
  socket.on('send_message', async ({ text } = {}) => {
    if (!text || typeof text !== 'string') return;

    const now = Date.now();
    if (lastMessage.has(socket.id) && now - lastMessage.get(socket.id) < RATE_LIMIT_MS) {
      return socket.emit('error', { message: 'Slow down!' });
    }
    lastMessage.set(socket.id, now);

    const room = await getRoomBySocketId(socket.id);
    if (!room) return;
    if (BLOCKED_PHASES.includes(room.phase)) return;

    // Respect chatEnabled setting during active game
    if (room.phase === 'game' && room.settings?.chatEnabled === false) return;

    // Check if sender is a spectator — spectators cannot chat
    const isSpectator = (room.spectators || []).find((s) => s.id === socket.id);
    if (isSpectator) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    const clean = text.replace(/<[^>]*>/g, '').trim().slice(0, 200);
    if (!clean) return;

    io.to(room.code).emit('message_received', {
      playerId: socket.id,
      name: player.name,
      color: player.color,
      text: clean,
    });
  });

  socket.on('disconnect', () => lastMessage.delete(socket.id));
};