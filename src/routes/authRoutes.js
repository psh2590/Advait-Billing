const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/verify', requireAuth, authController.verifySession);
router.post('/users', requireAuth, requireAdmin, authController.createUser);
router.get('/users', requireAuth, requireAdmin, authController.getAllUsers);
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
