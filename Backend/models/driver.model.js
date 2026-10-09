const mongoose = require('mongoose');
const accountPlugin = require('./shared/account.plugin');
const { pointSchema } = require('./shared/schemas');
const { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS, DRIVER_VERIFICATION } = require('../config/constants');

const driverSchema = new mongoose.Schema({
    // Profile shown to customers
    profilePhotoUrl: { type: String, trim: true },
    about: { type: String, trim: true, maxlength: 1000 },
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    languages: { type: [ String ], default: [] },
    services: { type: [ String ], enum: Object.keys(BOOKING_TYPES), default: [] },
    vehicleTypes: { type: [ String ], enum: CAR_TYPES, default: [] },
    transmissions: { type: [ String ], enum: TRANSMISSIONS, default: [] },
    rates: {
        hourly: { type: Number, min: 0 },
        fullDay: { type: Number, min: 0 },
        outstationPerDay: { type: Number, min: 0 }
    },
    serviceRadiusKm: { type: Number, min: 1, max: 100, default: 15 },

    // Onboarding details, visible to admins only
    address: { type: String, trim: true },
    licence: {
        number: { type: String, trim: true },
        expiry: { type: Date }
    },
    emergencyContact: {
        name: { type: String, trim: true },
        phone: { type: String, trim: true }
    },
    verification: {
        status: { type: String, enum: Object.values(DRIVER_VERIFICATION), default: DRIVER_VERIFICATION.PENDING },
        note: { type: String, trim: true },
        submittedAt: Date,
        reviewedAt: Date
    },

    // Live state
    isOnline: { type: Boolean, default: false },
    location: { type: pointSchema },
    locationUpdatedAt: Date,

    stats: {
        acceptedBookings: { type: Number, default: 0 },
        completedTrips: { type: Number, default: 0 },
        cancelledByDriver: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 }
    }
}, { timestamps: true });

driverSchema.plugin(accountPlugin);

driverSchema.index({ location: '2dsphere' });

// Share of accepted bookings the driver later cancelled, as a percentage.
driverSchema.virtual('cancellationRate').get(function () {
    const accepted = this.stats?.acceptedBookings || 0;
    return accepted ? Math.round((this.stats.cancelledByDriver / accepted) * 100) : 0;
});

driverSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.passwordReset;
        delete ret.__v;
        delete ret.id;
        return ret;
    }
});

module.exports = mongoose.model('driver', driverSchema);
