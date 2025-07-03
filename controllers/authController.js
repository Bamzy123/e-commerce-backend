const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    SERVER_ERROR: 500
};

const MESSAGES = {
    USER_EXISTS: 'User already exists',
    INVALID_CREDENTIALS: 'Invalid email or password',
    SERVER_ERROR: 'Server error',
    INVALID_REQUEST: 'Invalid request data'
};

const handleError = (res, statusCode, message, error = null) => {
    const response = {message};
    if (error && process.env.NODE_ENV === 'development') {
        response.error = error.message;
    }
    return res.status(statusCode).json(response);
};

const checkUserExists = async (email) => {
    return User.findOne({email});
};

const mapUserResponse = (user, token) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token
});

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const createUser = async (userData) => {
    const hashedPassword = await hashPassword(userData.password);
    const user = await User.create({
        ...userData,
        password: hashedPassword
    });
    const token = generateToken(user._id);
    return mapUserResponse(user, token);
};

exports.registerUser = async (req, res) => {
    const {name, email, password} = req.body;

    if (!name || !email || !password) {
        return handleError(res, HTTP_STATUS.BAD_REQUEST, MESSAGES.INVALID_REQUEST);
    }

    try {
        const existingUser = await checkUserExists(email);
        if (existingUser) {
            return handleError(res, HTTP_STATUS.BAD_REQUEST, MESSAGES.USER_EXISTS);
        }

        const userData = await createUser({name, email, password});
        res.status(HTTP_STATUS.CREATED).json(userData);
    } catch (err) {
        handleError(res, HTTP_STATUS.SERVER_ERROR, MESSAGES.SERVER_ERROR, err);
    }
};

exports.loginUser = async (req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        return handleError(res, HTTP_STATUS.BAD_REQUEST, MESSAGES.INVALID_REQUEST);
    }

    try {
        const user = await User.findOne({email}).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return handleError(res, HTTP_STATUS.UNAUTHORIZED, MESSAGES.INVALID_CREDENTIALS);
        }

        const token = generateToken(user._id);
        res.status(HTTP_STATUS.OK).json(mapUserResponse(user, token));
    } catch (err) {
        handleError(res, HTTP_STATUS.SERVER_ERROR, MESSAGES.SERVER_ERROR, err);
    }
};