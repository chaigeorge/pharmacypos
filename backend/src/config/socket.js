// Active POS sessions: Map<sessionId, socketId>
const activeSessions = new Map();

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // POS computer registers its session
    socket.on('pos:register', ({ sessionId, userId }) => {
      activeSessions.set(sessionId, socket.id);
      socket.join(`session:${sessionId}`);
      console.log(`POS registered - Session: ${sessionId}, User: ${userId}`);
      socket.emit('pos:registered', { sessionId, status: 'active' });
    });

    // Mobile phone sends a scanned barcode
    socket.on('scan:barcode', ({ sessionId, barcode, userId }) => {
      console.log(`Barcode scanned: ${barcode} -> Session: ${sessionId}`);

      // Forward barcode to the POS session
      io.to(`session:${sessionId}`).emit('scan:received', {
        barcode,
        timestamp: new Date().toISOString(),
        source: 'mobile',
      });

      // Acknowledge back to the phone
      socket.emit('scan:acknowledged', { barcode, status: 'sent' });
    });

    // Get active sessions for a user (so phone can pick the right POS)
    socket.on('sessions:get', ({ userId }) => {
      const userSessions = [];
      activeSessions.forEach((socketId, sessionId) => {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket && targetSocket.data.userId === userId) {
          userSessions.push(sessionId);
        }
      });
      socket.emit('sessions:list', { sessions: userSessions });
    });

    // POS unregisters when closing
    socket.on('pos:unregister', ({ sessionId }) => {
      activeSessions.delete(sessionId);
      socket.leave(`session:${sessionId}`);
      console.log(`POS unregistered - Session: ${sessionId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Clean up any sessions this socket owned
      activeSessions.forEach((socketId, sessionId) => {
        if (socketId === socket.id) {
          activeSessions.delete(sessionId);
          console.log(`Session cleaned up: ${sessionId}`);
        }
      });
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketHandlers };
