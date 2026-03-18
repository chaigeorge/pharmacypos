const express = require('express');
const router = express.Router();
const { getSuppliers, createSupplier, updateSupplier } = require('../controllers/catalogController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getSuppliers);
router.post('/', authorize('SUPERADMIN', 'MANAGER'), createSupplier);
router.put('/:id', authorize('SUPERADMIN', 'MANAGER'), updateSupplier);

module.exports = router;
