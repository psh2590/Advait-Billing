const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, billController.createBill);
router.get('/', requireAuth, billController.getAllBills);
router.get('/daily-sales', requireAuth, billController.getDailySales);
router.get('/:id', requireAuth, billController.getBillById);
router.patch('/:id/status', requireAuth, billController.updatePaymentStatus);

module.exports = router;
