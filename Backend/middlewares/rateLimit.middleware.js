const { rateLimit } = require('express-rate-limit');
const { authRateLimitMax } = require('../config/env');

// Slows down password guessing and sign-up spam from one IP.
module.exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in a few minutes.' }
});
