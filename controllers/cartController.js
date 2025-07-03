const Cart = require('../models/cart');
const Product = require('../models/product');

const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
};

const MESSAGES = {
    CART_NOT_FOUND: 'Cart not found',
    PRODUCT_NOT_FOUND: 'Product not found',
    SERVER_ERROR: 'Server error'
};

class CartService {
    static async findOrCreateCart(userId) {
        let cart = await Cart.findOne(userId);
        if (!cart) {
            cart = new Cart({
                userId,
                items: [],
                total: 0
            });
        }
        return cart;
    }

    static calculateTotal(items) {
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    static async validateProduct(productId) {
        const product = await Product.findById(productId);
        if (!product) {
            const error = new Error(MESSAGES.PRODUCT_NOT_FOUND);
            error.statusCode = HTTP_STATUS.NOT_FOUND;
            throw error;
        }
        return product;
    }
}

const handleAsync = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        res.status(error.statusCode || HTTP_STATUS.SERVER_ERROR).json({
            message: error.message || MESSAGES.SERVER_ERROR,
            error: error.message
        });
    }
};

exports.getUserCart = handleAsync(async (req, res) => {
    const cart = await Cart.findOne({userId: req.user.id}).populate('items.productId');
    if (!cart) {
        const error = new Error(MESSAGES.CART_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
    }
    res.json(cart);
});

exports.addToCart = handleAsync(async (req, res) => {
    const {productId, quantity} = req.body;
    const product = await CartService.validateProduct(productId);
    const cart = await CartService.findOrCreateCart(req.user.id);

    const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
    );

    if (itemIndex > -1) {
        cart.items[itemIndex].quantity += Number(quantity);
    } else {
        cart.items.push({
            productId,
            name: product.name,
            price: product.price,
            quantity,
            image: product.image
        });
    }

    cart.total = CartService.calculateTotal(cart.items);
    await cart.save();
    res.status(HTTP_STATUS.CREATED).json(cart);
});

exports.removeFromCart = handleAsync(async (req, res) => {
    const cart = await CartService.findOrCreateCart(req.user.id);
    if (!cart) {
        const error = new Error(MESSAGES.CART_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
    }

    cart.items = cart.items.filter(
        (item) => item.productId.toString() !== req.params.productId
    );
    cart.total = CartService.calculateTotal(cart.items);

    await cart.save();
    res.json(cart);
});