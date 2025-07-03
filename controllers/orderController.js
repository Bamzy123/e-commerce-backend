const Order = require('../models/order');
const Cart = require('../models/cart');
const {startSession} = require("mongoose");

const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
};

const ERROR_MESSAGES = {
    INVALID_INPUT: 'Shipping address and payment method are required',
    EMPTY_CART: 'Cart is empty',
    PAYMENT_FAILED: 'Payment processing failed',
    ORDER_NOT_FOUND: 'Order not found',
    SERVER_ERROR: 'Server error',
    ORDER_CREATION_FAILED: 'Failed to create order'
};

/**
 * Handles database transactions with automatic rollback on error
 * @param {Function} operation - Async function containing transaction operations
 * @returns {Promise<*>} - Resolution of the operation
 */
async function executeTransaction(operation) {
    const session = await startSession();
    session.startTransaction();

    try {
        const result = await operation(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
}

/**
 * Validates order creation input
 * @param {Object} input - Order input data
 * @returns {Boolean} - Validation result
 */
function validateOrderInput({shippingAddress, paymentMethod}) {
    return Boolean(shippingAddress && paymentMethod);
}

/**
 * Processes payment and handles payment-related errors
 * @param {string} paymentMethod - Payment method
 * @param {number} total - Order total
 * @returns {Promise<Object>} - Payment result
 */
async function handlePaymentProcessing(paymentMethod, total) {
    const paymentResult = await processPayment(paymentMethod, total);
    if (!paymentResult.success) {
        throw new Error(ERROR_MESSAGES.PAYMENT_FAILED);
    }
    return paymentResult;
}

exports.createOrder = async (req, res) => {
    const {shippingAddress, paymentMethod} = req.body;

    if (!validateOrderInput({shippingAddress, paymentMethod})) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            message: ERROR_MESSAGES.INVALID_INPUT
        });
    }

    try {
        const result = await executeTransaction(async (session) => {
            const cart = await Cart.findOne({userId: req.user.id});
            if (!cart?.items.length) {
                throw new Error(ERROR_MESSAGES.EMPTY_CART);
            }

            await handlePaymentProcessing(paymentMethod, cart.total);

            const order = new Order({
                userId: req.user.id,
                items: cart.items,
                total: cart.total,
                shippingAddress,
                paymentMethod,
                paymentStatus: 'completed'
            });

            const createdOrder = await order.save({session});
            await Cart.findByIdAndDelete(cart._id, {session});

            return createdOrder;
        });

        res.status(HTTP_STATUS.CREATED).json({
            orderId: result._id,
            message: 'Order created successfully'
        });
    } catch (error) {
        console.error('Order creation error:', error);
        const status = error.message === ERROR_MESSAGES.EMPTY_CART ?
            HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.SERVER_ERROR;
        res.status(status).json({message: error.message || ERROR_MESSAGES.ORDER_CREATION_FAILED});
    }
};

exports.getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({userId: req.user.id}).sort({createdAt: -1});
        res.status(HTTP_STATUS.OK).json(orders);
    } catch (error) {
        res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: ERROR_MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || order.userId.toString() !== req.user.id) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: ERROR_MESSAGES.ORDER_NOT_FOUND
            });
        }
        res.status(HTTP_STATUS.OK).json(order);
    } catch (error) {
        res.status(HTTP_STATUS.SERVER_ERROR).json({
            message: ERROR_MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};