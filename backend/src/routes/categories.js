const express = require('express');
const router = express.Router();
const { getCategories, createCategory } = require('../controllers/catalogController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getCategories);
router.post('/', authorize('SUPERADMIN', 'MANAGER'), createCategory);

module.exports = router;
