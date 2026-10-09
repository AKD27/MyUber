const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const bookingController = require('../controllers/booking.controller');
const { idParams } = require('../validators/common');
const schemas = require('../validators/booking.validators');

const customerOnly = requireAuth('customer');
const driverOnly = requireAuth('driver');
const either = requireAuth('customer', 'driver');
const withId = (body) => validate(body ? { params: idParams, body } : { params: idParams });

router.get('/', either, validate({ query: schemas.listBookingsSchema }), asyncHandler(bookingController.list));
router.get('/:id', either, withId(), asyncHandler(bookingController.get));

router.post('/', customerOnly, validate({ body: schemas.createBookingSchema }), asyncHandler(bookingController.create));
router.post('/:id/cancel', customerOnly, withId(schemas.cancelSchema), asyncHandler(bookingController.cancelByCustomer));
router.post('/:id/review', customerOnly, withId(schemas.reviewSchema), asyncHandler(bookingController.reviewDriver));

router.post('/:id/accept', driverOnly, withId(), asyncHandler(bookingController.accept));
router.post('/:id/reject', driverOnly, withId(schemas.rejectSchema), asyncHandler(bookingController.reject));
router.post('/:id/on-the-way', driverOnly, withId(), asyncHandler(bookingController.onTheWay));
router.post('/:id/arrived', driverOnly, withId(), asyncHandler(bookingController.arrived));
router.post('/:id/start', driverOnly, withId(schemas.otpSchema), asyncHandler(bookingController.start));
router.post('/:id/complete', driverOnly, withId(schemas.otpSchema), asyncHandler(bookingController.complete));
router.post('/:id/payment-received', driverOnly, withId(), asyncHandler(bookingController.paymentReceived));
router.post('/:id/driver-cancel', driverOnly, withId(schemas.cancelSchema), asyncHandler(bookingController.cancelByDriver));
router.post('/:id/review-customer', driverOnly, withId(schemas.reviewSchema), asyncHandler(bookingController.reviewCustomer));

module.exports = router;
