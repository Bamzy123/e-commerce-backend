// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const {
    getUserCart,
    addToCart,
    removeFromCart
} = require('../controllers/cartController');

// All cart routes are private
router.get('/', getUserCart);
router.post('/', addToCart);
router.delete('/:productId', removeFromCart);

module.exports = router;