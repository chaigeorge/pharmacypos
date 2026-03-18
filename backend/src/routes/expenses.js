// expenses.js
const express = require('express');
const router = express.Router();
const { getExpenses, createExpense, updateExpense, deleteExpense } = require('../controllers/expensesController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('SUPERADMIN', 'MANAGER'), getExpenses);
router.post('/', authorize('SUPERADMIN', 'MANAGER'), createExpense);
router.put('/:id', authorize('SUPERADMIN', 'MANAGER'), updateExpense);
router.delete('/:id', authorize('SUPERADMIN', 'MANAGER'), deleteExpense);

module.exports = router;
