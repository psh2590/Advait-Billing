const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');

router.post('/', billController.createBill);
router.get('/', billController.getAllBills);
router.get('/daily-sales', billController.getDailySales);
router.get('/:id', billController.getBillById);
router.patch('/:id/status', billController.updatePaymentStatus);

module.exports = router;
