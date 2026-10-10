const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { publicLimiter } = require('../middlewares/rateLimit.middleware');
const driverModel = require('../models/driver.model');
const bookingModel = require('../models/booking.model');
const reviewModel = require('../models/review.model');
const { DRIVER_VERIFICATION } = require('../config/constants');

const CACHE_MS = 60 * 1000;
let cached = { at: 0, data: null };

// Real figures and real customer reviews for the public home page. Nothing here is made up:
// the page hides a figure or the reviews when there is not enough yet.
const loadOverview = async () => {
    const [ verifiedDrivers, completedTrips, [ rating ], reviews ] = await Promise.all([
        driverModel.countDocuments({ 'verification.status': DRIVER_VERIFICATION.VERIFIED, accountStatus: 'active' }),
        bookingModel.countDocuments({ 'payment.status': 'paid' }),
        reviewModel.aggregate([
            { $match: { fromRole: 'customer' } },
            { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]),
        reviewModel.find({ fromRole: 'customer', rating: { $gte: 4 }, comment: { $exists: true, $ne: '' } })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate('customer', 'fullname.firstname')
            .populate('driver', 'fullname.firstname')
    ]);

    return {
        verifiedDrivers,
        completedTrips,
        rating: { average: rating ? Math.round(rating.average * 10) / 10 : 0, count: rating?.count || 0 },
        reviews: reviews.map(review => ({
            _id: review._id,
            rating: review.rating,
            comment: review.comment,
            customerName: review.customer?.fullname?.firstname,
            driverName: review.driver?.fullname?.firstname,
            createdAt: review.createdAt
        }))
    };
}

router.get('/overview', publicLimiter, asyncHandler(async (req, res) => {
    if (Date.now() - cached.at > CACHE_MS) {
        cached = { at: Date.now(), data: await loadOverview() };
    }

    return res.status(200).json(cached.data);
}));

module.exports = router;
