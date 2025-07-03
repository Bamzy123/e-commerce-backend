const Product = require('../models/product');

class ProductNotFoundError extends Error {
    constructor(message = ProductController.MESSAGES.PRODUCT_NOT_FOUND) {
        super(message);
        this.name = 'ProductNotFoundError';
        this.statusCode = ProductController.HTTP_STATUS.NOT_FOUND;
    }
}

class ProductController {
    static HTTP_STATUS = {
        OK: 200,
        CREATED: 201,
        NOT_FOUND: 404,
        SERVER_ERROR: 500
    };

    static MESSAGES = {
        SERVER_ERROR: 'Server error',
        PRODUCT_NOT_FOUND: 'Product not found',
        PRODUCT_REMOVED: 'Product removed'
    };

    constructor() {
        this.PRODUCT_FIELDS = ['name', 'description', 'price', 'category', 'image', 'stock', 'featured'];
    }

    handleError(res, err) {
        const statusCode = err instanceof ProductNotFoundError
            ? ProductController.HTTP_STATUS.NOT_FOUND
            : ProductController.HTTP_STATUS.SERVER_ERROR;

        const message = err instanceof ProductNotFoundError
            ? err.message
            : ProductController.MESSAGES.SERVER_ERROR;

        return res.status(statusCode).json({
            message,
            error: err.message
        });
    }

    async findProductById(id) {
        const product = await Product.findById(id);
        if (!product) {
            throw new ProductNotFoundError();
        }
        return product;
    }

    prepareProductData(data) {
        return this.PRODUCT_FIELDS.reduce((acc, field) => {
            if (data[field] !== undefined) {
                acc[field] = data[field];
            }
            return acc;
        }, {});
    }

    async getProducts(req, res) {
        try {
            const products = await Product.find({});
            res.status(ProductController.HTTP_STATUS.OK).json(products);
        } catch (err) {
            this.handleError(res, err);
        }
    }

    async getProductById(req, res) {
        try {
            const product = await this.findProductById(req.params.id);
            res.status(ProductController.HTTP_STATUS.OK).json(product);
        } catch (err) {
            this.handleError(res, err);
        }
    }

    async createProduct(req, res) {
        try {
            const productData = this.prepareProductData(req.body);
            const product = new Product(productData);
            const createdProduct = await product.save();
            res.status(ProductController.HTTP_STATUS.CREATED).json(createdProduct);
        } catch (err) {
            this.handleError(res, err);
        }
    }

    async updateProduct(req, res) {
        try {
            const product = await this.findProductById(req.params.id);
            const updatedData = this.prepareProductData(req.body);
            Object.assign(product, updatedData);
            const updatedProduct = await product.save();
            res.status(ProductController.HTTP_STATUS.OK).json(updatedProduct);
        } catch (err) {
            this.handleError(res, err);
        }
    }

    async deleteProduct(req, res) {
        try {
            const product = await this.findProductById(req.params.id);
            await product.deleteOne();
            res.status(ProductController.HTTP_STATUS.OK).json({
                message: ProductController.MESSAGES.PRODUCT_REMOVED
            });
        } catch (err) {
            this.handleError(res, err);
        }
    }
}

module.exports = new ProductController();