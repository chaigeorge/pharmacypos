const express = require('express');
const router = express.Router();
const { getInventory, getLowStock, updateStockEntry } = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getInventory);
router.get('/low-stock', getLowStock);
router.put('/:id', authorize('SUPERADMIN', 'MANAGER'), updateStockEntry);

module.exports = router;
