const express = require('express');
const router = express.Router();
const { createSale, getSales, getSaleById, voidSale } = require('../controllers/salesController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getSales);
router.get('/:id', getSaleById);
router.post('/', createSale);
router.put('/:id/void', authorize('SUPERADMIN', 'MANAGER'), voidSale);

module.exports = router;
