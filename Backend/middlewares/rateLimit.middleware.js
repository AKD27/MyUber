const { rateLimit } = require('express-rate-limit');
const { authRateLimitMax } = require('../config/env');

// Keeps pages that need no login (shared trip links) from being hammered.
module.exports.publicLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many requests. Please wait a moment.' }
});

// Slows down password guessing and sign-up spam from one IP.
module.exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in a few minutes.' }
});
