const express = require('express');
const router = express.Router();
const { receivePurchase, getPurchases, getPurchaseById } = require('../controllers/purchasesController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', receivePurchase);

module.exports = router;
