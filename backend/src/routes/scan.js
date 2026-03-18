const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Generate a new scan session ID for a POS terminal
router.post('/session', authenticate, (req, res) => {
  const sessionId = uuidv4();
  res.json({ sessionId });
});

// Mobile phone sends a barcode — forwards it via Socket.IO
router.post('/barcode', authenticate, (req, res) => {
  const { sessionId, barcode } = req.body;
  if (!sessionId || !barcode) {
    return res.status(400).json({ error: 'sessionId and barcode are required' });
  }

  const io = req.app.get('io');
  io.to(`session:${sessionId}`).emit('scan:received', {
    barcode,
    timestamp: new Date().toISOString(),
    source: 'mobile',
  });

  res.json({ message: 'Barcode sent', barcode });
});

module.exports = router;
