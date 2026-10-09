const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const authController = require('../controllers/auth.controller');
const schemas = require('../validators/auth.validators');

router.post('/register/customer', authLimiter, validate({ body: schemas.registerSchema }), asyncHandler(authController.registerCustomer));
router.post('/register/driver', authLimiter, validate({ body: schemas.registerSchema }), asyncHandler(authController.registerDriver));
router.post('/login', authLimiter, validate({ body: schemas.loginSchema }), asyncHandler(authController.login));
router.post('/logout', requireAuth(), asyncHandler(authController.logout));
router.get('/me', requireAuth(), asyncHandler(authController.me));
router.post('/forgot-password', authLimiter, validate({ body: schemas.forgotPasswordSchema }), asyncHandler(authController.forgotPassword));
router.post('/reset-password', authLimiter, validate({ body: schemas.resetPasswordSchema }), asyncHandler(authController.resetPassword));

module.exports = router;
