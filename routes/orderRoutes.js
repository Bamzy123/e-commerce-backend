// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    getOrderById
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createOrder);
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrderById);

module.exports = router;