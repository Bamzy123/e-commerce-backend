const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    )
    {
        try {
            if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'JWT secret is not configured' });
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            try {
                req.user = await User.findById(decoded.id).select('-password');
            } catch (dbError) {
                console.error('Database Error:', dbError.message);
                return res.status(500).json({ message: 'Server error while fetching user' });
            }

            if (!req.user) return res.status(401).json({ message: 'Not authorized, user not found' });
            next();
        } catch (error) {
            console.error('JWT Verification Error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else res.status(401).json({ message: 'Not authorized, no token' });
};

// Admin middleware
exports.adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else res.status(403).json({ message: 'Forbidden: Admins only' });
};