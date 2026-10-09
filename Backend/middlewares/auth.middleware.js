const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const userModel = require('../models/user.model');
const driverModel = require('../models/driver.model');
const blacklistTokenModel = require('../models/blacklistToken.model');

const ROLE_MODELS = { customer: userModel, admin: userModel, driver: driverModel };

const modelForRole = (role) => ROLE_MODELS[ role ];

// Browsers send the HTTP-only cookie; API clients may send a Bearer token instead.
const getTokenFromRequest = (req) => req.cookies?.token || req.headers.authorization?.match(/^Bearer (.+)$/)?.[ 1 ];

// Resolves a JWT to { role, account }, or null when it is missing, invalid, revoked or the account is gone.
const authenticateToken = async (token) => {
    if (!token || typeof token !== 'string') {
        return null;
    }

    let decoded;
    try {
        decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
        return null;
    }

    const model = modelForRole(decoded.role);

    if (!model || await blacklistTokenModel.exists({ token })) {
        return null;
    }

    const account = await model.findById(decoded._id);

    // Customers and admins share a collection, so the stored role must match the token's.
    if (!account || (account.role && account.role !== decoded.role)) {
        return null;
    }

    return { role: decoded.role, account, token };
}

// Allows the request only for the given roles; attaches req.auth = { role, account, token }.
const requireAuth = (...roles) => async (req, res, next) => {
    try {
        const auth = await authenticateToken(getTokenFromRequest(req));

        if (!auth || (roles.length && !roles.includes(auth.role))) {
            return res.status(401).json({ message: 'Please log in to continue' });
        }

        if (auth.account.accountStatus === 'suspended') {
            return res.status(403).json({ message: 'Your account is suspended. Please contact support.' });
        }

        req.auth = auth;
        return next();
    } catch (err) {
        return next(err);
    }
}

module.exports = { modelForRole, getTokenFromRequest, authenticateToken, requireAuth };
