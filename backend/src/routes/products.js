const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductByBarcode,
  getProductById,
  createProduct,
  updateProduct,
  bulkCreateProducts,
} = require('../controllers/productsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);
router.post('/', authorize('SUPERADMIN', 'MANAGER'), createProduct);
router.put('/:id', authorize('SUPERADMIN', 'MANAGER'), updateProduct);
router.post('/bulk', authorize('SUPERADMIN', 'MANAGER'), bulkCreateProducts);

module.exports = router;
