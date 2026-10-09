const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const mapsController = require('../controllers/maps.controller');
const { z } = require('../validators/common');

router.use(requireAuth());

router.get('/suggestions',
    validate({ query: z.object({ input: z.string().trim().min(3, 'Type at least 3 characters').max(200) }) }),
    asyncHandler(mapsController.getSuggestions));

router.get('/reverse',
    validate({ query: z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }) }),
    asyncHandler(mapsController.reverseGeocode));

module.exports = router;
