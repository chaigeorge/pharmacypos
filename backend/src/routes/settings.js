const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getSettings);
router.put('/', authorize('SUPERADMIN'), updateSettings);

module.exports = router;
