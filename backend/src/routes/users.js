const express = require('express');
const router = express.Router();
const { getUsers, getUserById, createUser, updateUser, resetPassword } = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('SUPERADMIN'), getUsers);
router.get('/:id', authorize('SUPERADMIN'), getUserById);
router.post('/', authorize('SUPERADMIN'), createUser);
router.put('/:id', authorize('SUPERADMIN'), updateUser);
router.put('/:id/reset-password', authorize('SUPERADMIN'), resetPassword);

module.exports = router;
