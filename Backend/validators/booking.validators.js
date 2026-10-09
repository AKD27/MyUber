const { z, objectId, placeInput } = require('./common');
const { BOOKING_TYPES, OUTSTATION_TRIP_TYPES, CAR_TYPES, TRANSMISSIONS } = require('../config/constants');

const MAX_DAYS_AHEAD = 60;
const START_GRACE_MS = 5 * 60 * 1000;

const bookingDetails = z.object({
    bookingType: z.enum(Object.keys(BOOKING_TYPES)),
    tripType: z.enum(OUTSTATION_TRIP_TYPES).optional(),
    pickup: placeInput,
    destination: placeInput.optional(),
    startTime: z.string().datetime({ offset: true, message: 'Choose a valid date and time' }).transform(value => new Date(value)),
    duration: z.number().int('Duration must be a whole number'),
    vehicle: z.object({
        type: z.enum(CAR_TYPES),
        transmission: z.enum(TRANSMISSIONS),
        model: z.string().trim().max(60).optional()
    }),
    notes: z.string().trim().max(500).optional()
});

// Rules that depend on the booking type.
const checkBookingRules = (data, ctx) => {
    const type = BOOKING_TYPES[ data.bookingType ];

    if (data.duration < type.min || data.duration > type.max) {
        ctx.addIssue({ code: 'custom', path: [ 'duration' ], message: `${type.label} bookings are ${type.min}–${type.max} ${type.unit}` });
    }

    if (type.needsDestination && !data.destination) {
        ctx.addIssue({ code: 'custom', path: [ 'destination' ], message: 'Enter a destination' });
    }

    if (data.bookingType === 'outstation' && !data.tripType) {
        ctx.addIssue({ code: 'custom', path: [ 'tripType' ], message: 'Choose one way or round trip' });
    }

    const now = Date.now();

    if (data.startTime.getTime() < now - START_GRACE_MS) {
        ctx.addIssue({ code: 'custom', path: [ 'startTime' ], message: 'Start time is in the past' });
    } else if (data.startTime.getTime() > now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
        ctx.addIssue({ code: 'custom', path: [ 'startTime' ], message: `Bookings can be made up to ${MAX_DAYS_AHEAD} days ahead` });
    }
}

module.exports.searchDriversSchema = bookingDetails.extend({
    filters: z.object({
        language: z.string().trim().max(30).optional(),
        minRating: z.number().min(0).max(5).optional(),
        minExperience: z.number().int().min(0).max(60).optional(),
        maxPrice: z.number().positive().optional()
    }).optional(),
    sort: z.enum([ 'recommended', 'distance', 'price', 'rating', 'experience' ]).default('recommended')
}).superRefine(checkBookingRules);

module.exports.createBookingSchema = bookingDetails.extend({
    driverId: objectId
}).superRefine(checkBookingRules);

module.exports.rejectSchema = z.object({ reason: z.string().trim().max(300).optional() });

module.exports.cancelSchema = z.object({ reason: z.string().trim().max(300).optional() });

module.exports.otpSchema = z.object({ otp: z.string().regex(/^\d{4}$/, 'Enter the 4-digit OTP') });

module.exports.reviewSchema = z.object({
    rating: z.number().int().min(1, 'Choose 1 to 5 stars').max(5),
    comment: z.string().trim().max(1000).optional()
});

module.exports.listBookingsSchema = z.object({
    scope: z.enum([ 'all', 'requests', 'upcoming', 'active', 'past' ]).default('all')
});
