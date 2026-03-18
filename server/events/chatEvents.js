const { getRoomBySocketId } = require('../rooms/roomManager');

// Rate limit: track last message time per socket
const lastMessage = new Map();
const RATE_LIMIT_MS = 1000;
const BLOCKED_PHASES = ['assigning', 'role_reveal'];

module.exports = function registerChatEvents(io, socket) {
  socket.on('send_message', async ({ text } = {}) => {
    if (!text || typeof text !== 'string') return;

    // Rate limit
    const now = Date.now();
    if (lastMessage.has(socket.id) && now - lastMessage.get(socket.id) < RATE_LIMIT_MS) {
      return socket.emit('error', { message: 'Slow down!' });
    }
    lastMessage.set(socket.id, now);

    const room = await getRoomBySocketId(socket.id);
    if (!room) return;
    if (BLOCKED_PHASES.includes(room.phase)) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    // Sanitize: strip HTML tags, limit length
    const clean = text.replace(/<[^>]*>/g, '').trim().slice(0, 200);
    if (!clean) return;

    io.to(room.code).emit('message_received', {
      playerId: socket.id,
      name: player.name,
      color: player.color,
      text: clean,
    });
  });

  socket.on('disconnect', () => {
    lastMessage.delete(socket.id);
  });
};
