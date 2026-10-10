const mongoose = require('mongoose');
const { placeSchema } = require('./shared/schemas');
const { BOOKING_TYPES, OUTSTATION_TRIP_TYPES, CAR_TYPES, TRANSMISSIONS, BOOKING_STATUS } = require('../config/constants');

const bookingSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'driver', required: true, index: true },

    bookingType: { type: String, enum: Object.keys(BOOKING_TYPES), required: true },
    tripType: { type: String, enum: OUTSTATION_TRIP_TYPES },
    pickup: { type: placeSchema, required: true },
    destination: { type: placeSchema },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: {
        value: { type: Number, required: true },
        unit: { type: String, enum: [ 'hours', 'days' ], required: true }
    },
    // Road estimate between pickup and destination, when there is a destination.
    routeEstimate: {
        distanceKm: Number,
        durationMinutes: Number
    },

    // The customer's own car the driver will drive.
    vehicle: {
        type: { type: String, enum: CAR_TYPES, required: true },
        transmission: { type: String, enum: TRANSMISSIONS, required: true },
        model: { type: String, trim: true, maxlength: 60 }
    },
    notes: { type: String, trim: true, maxlength: 500 },

    pricing: {
        rate: { type: Number, required: true },
        rateUnit: { type: String, enum: [ 'hour', 'day', 'full_day' ], required: true },
        baseCharges: { type: Number, required: true },
        extraCharges: { type: Number, default: 0 },
        driverCharges: { type: Number, required: true },
        commissionPercent: { type: Number, required: true },
        platformCommission: { type: Number, required: true },
        driverEarning: { type: Number, required: true }
    },
    payment: {
        method: { type: String, enum: [ 'cash' ], default: 'cash' },
        status: { type: String, enum: [ 'pending', 'paid' ], default: 'pending' },
        paidAt: Date
    },

    status: { type: String, enum: Object.values(BOOKING_STATUS), default: BOOKING_STATUS.REQUESTED, index: true },
    statusHistory: [ {
        _id: false,
        status: String,
        at: { type: Date, default: Date.now }
    } ],
    requestExpiresAt: Date,
    rejectionReason: { type: String, trim: true },
    cancellation: {
        by: { type: String, enum: [ 'customer', 'driver', 'admin', 'system' ] },
        reason: { type: String, trim: true }
    },

    // The customer shares the start OTP at pickup and the end OTP when the trip ends.
    startOtp: { type: String, select: false },
    endOtp: { type: String, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpLockedUntil: { type: Date },

    // Lets the customer share a read-only live view of the trip with family or friends.
    shareToken: { type: String, select: false },

    tripStartedAt: Date,
    tripCompletedAt: Date,

    customerReview: { type: mongoose.Schema.Types.ObjectId, ref: 'review' },
    driverReview: { type: mongoose.Schema.Types.ObjectId, ref: 'review' }
}, { timestamps: true });

bookingSchema.index({ driver: 1, status: 1, startTime: 1 });
bookingSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

bookingSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.__v;
        delete ret.otpAttempts;
        delete ret.otpLockedUntil;
        delete ret.shareToken;
        return ret;
    }
});

module.exports = mongoose.model('booking', bookingSchema);
