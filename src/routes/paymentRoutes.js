const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/generate-qr', paymentController.generateQRCode);
router.post('/confirm', paymentController.confirmPayment);
router.get('/history', paymentController.getPaymentHistory);
router.get('/:payment_id', paymentController.checkPaymentStatus);

module.exports = router;
