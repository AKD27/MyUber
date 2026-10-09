const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const driverController = require('../controllers/driver.controller');
const { idParams } = require('../validators/common');
const schemas = require('../validators/driver.validators');
const { searchDriversSchema } = require('../validators/booking.validators');

const driverOnly = requireAuth('driver');
const customerOnly = requireAuth('customer');

// The logged-in driver
router.get('/me', driverOnly, asyncHandler(driverController.getMyProfile));
router.patch('/me', driverOnly, validate({ body: schemas.updateDriverProfileSchema }), asyncHandler(driverController.updateMyProfile));
router.post('/me/submit-verification', driverOnly, asyncHandler(driverController.submitForVerification));
router.patch('/me/availability', driverOnly, validate({ body: schemas.availabilitySchema }), asyncHandler(driverController.setAvailability));
router.patch('/me/location', driverOnly, validate({ body: schemas.locationSchema }), asyncHandler(driverController.updateLocation));
router.get('/me/dashboard', driverOnly, asyncHandler(driverController.getDashboard));

// Customers finding and viewing drivers
router.post('/search', customerOnly, validate({ body: searchDriversSchema }), asyncHandler(driverController.searchDrivers));
router.get('/:id', customerOnly, validate({ params: idParams }), asyncHandler(driverController.getPublicProfile));

module.exports = router;
