const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', productController.getAllProducts);
router.get('/low-stock', requireAuth, productController.getLowStock);
router.get('/:id', productController.getProductById);
router.post('/', requireAuth, requireAdmin, productController.addProduct);
router.put('/:id', requireAuth, requireAdmin, productController.updateProduct);
router.delete('/:id', requireAuth, requireAdmin, productController.deleteProduct);
router.patch('/:id/stock', requireAuth, productController.updateStock);

module.exports = router;
