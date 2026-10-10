const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const supportController = require('../controllers/support.controller');
const schemas = require('../validators/support.validators');

router.use(requireAuth('customer', 'driver'));

router.get('/complaints', asyncHandler(supportController.listComplaints));
router.post('/complaints', validate({ body: schemas.complaintSchema }), asyncHandler(supportController.createComplaint));

router.get('/notifications', asyncHandler(supportController.listNotifications));
router.post('/notifications/read', asyncHandler(supportController.markNotificationsRead));

module.exports = router;
