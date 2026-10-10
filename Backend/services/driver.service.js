const driverModel = require('../models/driver.model');
const reviewModel = require('../models/review.model');
const { DRIVER_VERIFICATION } = require('../config/constants');
const { searchRadiusKm } = require('../config/env');
const { resolvePlace } = require('./maps.service');
const { REQUIRED_RATES, quote } = require('./pricing.service');
const { busyDriverIds } = require('./availability.service');
const { emitToAdmins } = require('../socket');
const { savePhoto, removePhoto } = require('./upload.service');
const { localClock, toMinutes } = require('../utils/localTime');
const httpError = require('../utils/httpError');

const RATE_LABELS = { hourly: 'hourly rate', fullDay: 'full-day rate', outstationPerDay: 'outstation per-day rate' };

// What a driver still has to fill in before admins can verify them.
const missingProfileFields = (driver) => {
    const missing = [];

    if (!driver.experienceYears && driver.experienceYears !== 0) missing.push('driving experience');
    if (!driver.languages?.length) missing.push('languages');
    if (!driver.services?.length) missing.push('services offered');
    if (!driver.vehicleTypes?.length) missing.push('car types you can drive');
    if (!driver.transmissions?.length) missing.push('transmissions you can drive');
    if (!driver.address) missing.push('address');
    if (!driver.licence?.number || !driver.licence?.expiry) missing.push('driving licence details');
    else if (driver.licence.expiry < new Date()) missing.push('a licence that has not expired');
    if (!driver.emergencyContact?.name || !driver.emergencyContact?.phone) missing.push('emergency contact');
    if (!driver.location?.coordinates?.length) missing.push('base location');

    const neededRates = new Set((driver.services || []).flatMap(service => REQUIRED_RATES[ service ]));
    for (const rate of neededRates) {
        if (!(driver.rates?.[ rate ] > 0)) missing.push(RATE_LABELS[ rate ]);
    }

    return missing;
}

module.exports.missingProfileFields = missingProfileFields;

module.exports.updateProfile = async (driver, updates) => {
    const { baseLocation, ...fields } = updates;

    // Licence changes must be re-checked, so a verified driver goes back to review.
    const licenceChanged = fields.licence && (
        fields.licence.number !== driver.licence?.number ||
        fields.licence.expiry?.getTime() !== driver.licence?.expiry?.getTime()
    );

    if (fields.rates) {
        fields.rates = {
            hourly: driver.rates?.hourly,
            fullDay: driver.rates?.fullDay,
            outstationPerDay: driver.rates?.outstationPerDay,
            ...fields.rates
        };
    }

    driver.set(fields);

    if (baseLocation) {
        const place = await resolvePlace(baseLocation);
        driver.location = place.location;
        driver.locationUpdatedAt = new Date();
    }

    if (licenceChanged && driver.verification.status === DRIVER_VERIFICATION.VERIFIED) {
        driver.verification.status = DRIVER_VERIFICATION.UNDER_REVIEW;
        driver.verification.submittedAt = new Date();
        driver.isOnline = false;
    }

    await driver.save();
    return driver;
}

// Replaces the driver's profile photo with an uploaded image.
module.exports.updatePhoto = async (driver, file) => {
    const previous = driver.profilePhotoUrl;

    driver.profilePhotoUrl = await savePhoto(file);
    await driver.save();
    await removePhoto(previous);

    return driver;
}

module.exports.submitForVerification = async (driver) => {
    if ([ DRIVER_VERIFICATION.UNDER_REVIEW, DRIVER_VERIFICATION.VERIFIED ].includes(driver.verification.status)) {
        throw httpError(409, `Your profile is already ${driver.verification.status.replace('_', ' ')}`);
    }

    const missing = missingProfileFields(driver);

    if (missing.length) {
        throw httpError(400, `Please add: ${missing.join(', ')}`);
    }

    driver.verification = {
        status: DRIVER_VERIFICATION.UNDER_REVIEW,
        submittedAt: new Date()
    };
    await driver.save();

    emitToAdmins('admin:alert', { type: 'verification', message: `${driver.fullname.firstname} submitted their profile for verification` });
    return driver;
}

module.exports.setAvailability = async (driver, isOnline) => {
    if (isOnline && driver.verification.status !== DRIVER_VERIFICATION.VERIFIED) {
        throw httpError(403, 'You can go online once your profile is verified');
    }

    if (isOnline && !driver.location?.coordinates?.length) {
        throw httpError(400, 'Set your location before going online');
    }

    driver.isOnline = isOnline;
    await driver.save();
    return driver;
}

// Fields customers may see about a driver.
const PUBLIC_FIELDS = 'fullname profilePhotoUrl about experienceYears languages services vehicleTypes transmissions rates rating stats verification.status';

const toPublicDriver = (driver) => ({
    _id: driver._id,
    fullname: driver.fullname,
    profilePhotoUrl: driver.profilePhotoUrl,
    about: driver.about,
    experienceYears: driver.experienceYears,
    languages: driver.languages,
    services: driver.services,
    vehicleTypes: driver.vehicleTypes,
    transmissions: driver.transmissions,
    rates: driver.rates,
    rating: driver.rating,
    completedTrips: driver.stats?.completedTrips || 0,
    cancellationRate: driver.stats?.acceptedBookings
        ? Math.round((driver.stats.cancelledByDriver / driver.stats.acceptedBookings) * 100)
        : 0,
    verified: driver.verification?.status === DRIVER_VERIFICATION.VERIFIED
});

module.exports.toPublicDriver = toPublicDriver;

// Drivers with working hours switched on are only offered bookings that start inside them.
const isWorkingAt = (driver, startTime) => {
    const hours = driver.workingHours;

    if (!hours?.enabled) {
        return true;
    }

    const { day, minutes } = localClock(startTime);
    return hours.days.includes(day) && minutes >= toMinutes(hours.start) && minutes < toMinutes(hours.end);
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
    recommended: (a, b) => b.rating.average - a.rating.average || a.distanceKm - b.distanceKm,
    distance: (a, b) => a.distanceKm - b.distanceKm,
    price: (a, b) => a.price.driverCharges - b.price.driverCharges,
    rating: (a, b) => b.rating.average - a.rating.average || b.rating.count - a.rating.count,
    experience: (a, b) => b.experienceYears - a.experienceYears
};

// Verified, online drivers who serve this pickup, offer this booking type, can drive the customer's car
// and are free for the whole booking window — each with their price for this booking.
module.exports.searchAvailableDrivers = async ({ bookingType, pickup, startTime, endTime, duration, vehicle, filters = {}, sort }) => {
    const query = {
        'verification.status': DRIVER_VERIFICATION.VERIFIED,
        accountStatus: 'active',
        isOnline: true,
        services: bookingType,
        vehicleTypes: vehicle.type,
        transmissions: vehicle.transmission
    };

    if (filters.language) query.languages = new RegExp(`^${escapeRegex(filters.language)}$`, 'i');
    if (filters.minExperience) query.experienceYears = { $gte: filters.minExperience };
    if (filters.minRating) query[ 'rating.average' ] = { $gte: filters.minRating };

    const candidates = await driverModel.aggregate([
        {
            $geoNear: {
                near: pickup.location,
                distanceField: 'distanceMeters',
                maxDistance: searchRadiusKm * 1000,
                query,
                spherical: true
            }
        },
        // Each driver also has their own service radius.
        { $match: { $expr: { $lte: [ '$distanceMeters', { $multiply: [ '$serviceRadiusKm', 1000 ] } ] } } },
        { $limit: 200 }
    ]);

    const busy = await busyDriverIds(candidates.map(driver => driver._id), startTime, endTime);

    const drivers = candidates
        .filter(driver => !busy.has(driver._id.toString()) && isWorkingAt(driver, startTime))
        .map(driver => ({
            ...toPublicDriver(driver),
            distanceKm: Math.round(driver.distanceMeters / 100) / 10,
            price: quote(driver, bookingType, duration.value)
        }))
        .filter(driver => driver.price && (!filters.maxPrice || driver.price.driverCharges <= filters.maxPrice));

    return drivers.sort(SORTS[ sort ] || SORTS.recommended).slice(0, 50);
}

module.exports.getPublicProfile = async (driverId) => {
    const driver = await driverModel.findOne({
        _id: driverId,
        'verification.status': DRIVER_VERIFICATION.VERIFIED,
        accountStatus: 'active'
    }).select(PUBLIC_FIELDS);

    if (!driver) {
        throw httpError(404, 'Driver not found');
    }

    const reviews = await reviewModel.find({ driver: driverId, fromRole: 'customer' })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('customer', 'fullname.firstname');

    return {
        ...toPublicDriver(driver),
        reviews: reviews.map(review => ({
            _id: review._id,
            rating: review.rating,
            comment: review.comment,
            customerName: review.customer?.fullname?.firstname,
            createdAt: review.createdAt
        }))
    };
}
