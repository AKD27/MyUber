const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const customerController = require('../controllers/customer.controller');
const { idParams } = require('../validators/common');
const schemas = require('../validators/auth.validators');

router.use(requireAuth('customer'));

router.patch('/me', validate({ body: schemas.updateCustomerSchema }), asyncHandler(customerController.updateProfile));
router.post('/me/locations', validate({ body: schemas.savedLocationSchema }), asyncHandler(customerController.addSavedLocation));
router.delete('/me/locations/:id', validate({ params: idParams }), asyncHandler(customerController.deleteSavedLocation));

module.exports = router;
