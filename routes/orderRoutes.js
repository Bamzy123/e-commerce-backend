// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const {
    createOrder,
    getUserOrders,
    getOrderById
} = require('../controllers/orderController');

// @route   POST /api/orders
router.post('/', createOrder);

// @route   GET /api/orders
router.get('/', getUserOrders);

// @route   GET /api/orders/:id
router.get('/:id', getOrderById);

module.exports = router;