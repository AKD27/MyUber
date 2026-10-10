const bookingModel = require('../models/booking.model');
const reviewModel = require('../models/review.model');
const { appTimezone } = require('../config/env');
const { localDay } = require('../utils/localTime');

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;

const SUMS = {
    gross: { $sum: '$pricing.driverCharges' },
    commission: { $sum: '$pricing.platformCommission' },
    net: { $sum: '$pricing.driverEarning' },
    trips: { $sum: 1 }
};

const EMPTY = { gross: 0, commission: 0, net: 0, trips: 0 };

const add = (total, day) => ({
    gross: total.gross + day.gross,
    commission: total.commission + day.commission,
    net: total.net + day.net,
    trips: total.trips + day.trips
});

// A driver's paid trips: totals for today, the last 7 and 30 days and all time, a day-by-day
// series for the chart, and the latest trips. Cash is collected by the driver, so "commission"
// is what the driver owes the platform out of it.
module.exports.getDriverEarnings = async (driver) => {
    const paid = { driver: driver._id, 'payment.status': 'paid' };
    const now = new Date();

    const [ [ allTime ], days, trips ] = await Promise.all([
        bookingModel.aggregate([ { $match: paid }, { $group: { _id: null, ...SUMS } } ]),
        bookingModel.aggregate([
            { $match: { ...paid, 'payment.paidAt': { $gte: new Date(now.getTime() - 31 * DAY_MS) } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment.paidAt', timezone: appTimezone } }, ...SUMS } }
        ]),
        bookingModel.find(paid)
            .sort({ 'payment.paidAt': -1 })
            .limit(50)
            .select('bookingType tripType duration startTime pricing payment customer')
            .populate('customer', 'fullname')
    ]);

    const byDay = new Map(days.map(day => [ day._id, day ]));
    const dayKey = (daysAgo) => localDay(new Date(now.getTime() - daysAgo * DAY_MS));
    const sumOfLast = (count) => Array.from({ length: count }, (_, i) => byDay.get(dayKey(i)) || EMPTY).reduce(add, EMPTY);

    return {
        today: sumOfLast(1),
        last7Days: sumOfLast(7),
        last30Days: sumOfLast(30),
        allTime: allTime ? add(EMPTY, allTime) : EMPTY,
        daily: Array.from({ length: CHART_DAYS }, (_, i) => {
            const date = dayKey(CHART_DAYS - 1 - i);
            const day = byDay.get(date) || EMPTY;
            return { date, net: day.net, trips: day.trips };
        }),
        trips
    };
}

// Reviews customers left for a driver, newest first.
module.exports.getDriverReviews = async (driver) => {
    const reviews = await reviewModel.find({ driver: driver._id, fromRole: 'customer' })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('customer', 'fullname.firstname');

    return reviews.map(review => ({
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        customerName: review.customer?.fullname?.firstname,
        createdAt: review.createdAt
    }));
}
