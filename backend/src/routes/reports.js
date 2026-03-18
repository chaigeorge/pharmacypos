const express = require('express');
const router = express.Router();
const { getSalesReport, getBestSellers, getInventoryValue, getProfitReport } = require('../controllers/reportsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('SUPERADMIN', 'MANAGER'));
router.get('/sales', getSalesReport);
router.get('/best-sellers', getBestSellers);
router.get('/inventory-value', getInventoryValue);
router.get('/profit', getProfitReport);

module.exports = router;
