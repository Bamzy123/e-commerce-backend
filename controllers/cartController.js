// controllers/cartController.js
const Cart = require('../models/cart');
const Product = require('../models/product');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getUserCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        res.json(cart);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let cart = await Cart.findOne({ userId: req.user.id });

        if (!cart) {
            cart = new Cart({
                userId: req.user.id,
                items: [],
                total: 0
            });
        }

        const itemIndex = cart.items.findIndex(
            (item) => item.productId.toString() === productId
        );

        if (itemIndex > -1) {
            // Update quantity if item exists
            cart.items[itemIndex].quantity += Number(quantity);
        } else {
            // Add new item
            cart.items.push({
                productId,
                name: product.name,
                price: product.price,
                quantity,
                image: product.image
            });
        }

        // Recalculate total
        cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        await cart.save();

        res.status(201).json(cart);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
exports.removeFromCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = cart.items.filter(
            (item) => item.productId.toString() !== req.params.productId
        );

        cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        await cart.save();

        res.json(cart);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};