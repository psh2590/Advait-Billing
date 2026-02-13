const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

router.post('/generate-qr', requireAuth, paymentController.generateQRCode);
router.post('/confirm', requireAuth, paymentController.confirmPayment);
router.get('/history', requireAuth, paymentController.getPaymentHistory);

module.exports = router;
