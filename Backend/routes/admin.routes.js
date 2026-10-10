const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const adminController = require('../controllers/admin.controller');
const { idParams } = require('../validators/common');
const schemas = require('../validators/admin.validators');
const support = require('../validators/support.validators');

router.use(requireAuth('admin'));

router.get('/stats', asyncHandler(adminController.getStats));

router.get('/drivers', validate({ query: schemas.listDriversSchema }), asyncHandler(adminController.listDrivers));
router.get('/drivers/:id', validate({ params: idParams }), asyncHandler(adminController.getDriver));
router.patch('/drivers/:id/verification', validate({ params: idParams, body: schemas.verificationSchema }), asyncHandler(adminController.setDriverVerification));
router.patch('/drivers/:id/account-status', validate({ params: idParams, body: schemas.accountStatusSchema }), asyncHandler(adminController.setDriverAccountStatus));

router.get('/customers', validate({ query: schemas.listCustomersSchema }), asyncHandler(adminController.listCustomers));
router.get('/customers/:id', validate({ params: idParams }), asyncHandler(adminController.getCustomer));
router.patch('/customers/:id/account-status', validate({ params: idParams, body: schemas.accountStatusSchema }), asyncHandler(adminController.setCustomerAccountStatus));

router.get('/bookings', validate({ query: schemas.listBookingsSchema }), asyncHandler(adminController.listBookings));

router.get('/bookings/:id', validate({ params: idParams }), asyncHandler(adminController.getBooking));
router.post('/bookings/:id/cancel', validate({ params: idParams, body: schemas.adminCancelSchema }), asyncHandler(adminController.cancelBooking));

router.get('/complaints', validate({ query: schemas.listComplaintsSchema }), asyncHandler(adminController.listComplaints));
router.patch('/complaints/:id', validate({ params: idParams, body: support.complaintUpdateSchema }), asyncHandler(adminController.updateComplaint));

router.get('/sos', validate({ query: schemas.listSosSchema }), asyncHandler(adminController.listSosAlerts));
router.patch('/sos/:id/resolve', validate({ params: idParams, body: support.sosResolveSchema }), asyncHandler(adminController.resolveSosAlert));

module.exports = router;
