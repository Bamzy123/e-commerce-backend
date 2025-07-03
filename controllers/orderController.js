const Order = require('../models/order');
const Cart = require('../models/cart');
const {startSession} = require("mongoose");

exports.createOrder = async (req, res) => {
    const { shippingAddress, paymentMethod } = req.body;

    // Input validation
    if (!shippingAddress || !paymentMethod) {
        return res.status(400).json({
            message: 'Shipping address and payment method are required'
        });
    }
    const session = await startSession();
    session.startTransaction();

    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        const paymentResult = await processPayment(paymentMethod, cart.total);
        if (!paymentResult.success) {
            return res.status(400).json({ 
                message: 'Payment processing failed' 
            });
        }

        const order = new Order({
            userId: req.user.id,
            items: cart.items,
            total: cart.total,
            shippingAddress,
            paymentMethod,
            paymentStatus: 'completed'
        });

        const createdOrder = await order.save({ session });
        await Cart.findByIdAndDelete(cart._id, { session });

        // Commit transaction
        await session.commitTransaction();
        
        res.status(201).json({
            orderId: createdOrder._id,
            message: 'Order created successfully'
        });
    } catch (err) {
        // Rollback transaction on error
        await session.abortTransaction();
        console.error('Order creation error:', err);
        res.status(500).json({ message: 'Failed to create order' });
    } finally {
          await session.endSession();
    }
};

exports.getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || order.userId.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};