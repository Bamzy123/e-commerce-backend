// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const {
    getUserCart,
    addToCart,
    removeFromCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getUserCart);
router.post('/', protect, addToCart);
router.delete('/:productId', protect, removeFromCart);

module.exports = router;