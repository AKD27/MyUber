const crypto = require('crypto');
const driverModel = require('../models/driver.model');
const bookingModel = require('../models/booking.model');
const sosAlertModel = require('../models/sosAlert.model');
const { ACTIVE_BOOKING_STATUSES, TRACKING_STATUSES, BOOKING_STATUS: S } = require('../config/constants');
const { emitToAccount, emitToAdmins } = require('../socket');
const httpError = require('../utils/httpError');

// Saves a driver's position and passes it on to customers who are following that driver right now.
module.exports.recordDriverLocation = async (driverId, lat, lng) => {
    const at = new Date();

    await driverModel.updateOne({ _id: driverId }, {
        location: { type: 'Point', coordinates: [ lng, lat ] },
        locationUpdatedAt: at
    });

    const tracked = await bookingModel.find({ driver: driverId, status: { $in: TRACKING_STATUSES } }).select('customer');

    for (const booking of tracked) {
        emitToAccount('customer', booking.customer, 'booking:location', { bookingId: booking._id, lat, lng, at });
    }
}

// The driver's last known position as { lat, lng, updatedAt }, or undefined.
const locationOf = (driver) => driver?.location?.coordinates?.length
    ? { lat: driver.location.coordinates[ 1 ], lng: driver.location.coordinates[ 0 ], updatedAt: driver.locationUpdatedAt }
    : undefined;

module.exports.locationOf = locationOf;

// ---------- Trip sharing ----------

// Creates (once) the secret link token a customer can send to family or friends.
module.exports.createShareToken = async (customer, bookingId) => {
    const booking = await bookingModel.findOne({ _id: bookingId, customer: customer._id }).select('+shareToken status');

    if (!booking) throw httpError(404, 'Booking not found');
    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
        throw httpError(409, 'A trip can be shared from the time the driver accepts until it ends');
    }

    if (!booking.shareToken) {
        booking.shareToken = crypto.randomBytes(20).toString('hex');
        await booking.save();
    }

    return booking.shareToken;
}

// What someone with the share link may see: no phone numbers, OTPs or prices.
module.exports.getSharedTrip = async (token) => {
    const booking = await bookingModel.findOne({ shareToken: token })
        .populate('customer', 'fullname.firstname')
        .populate('driver', 'fullname profilePhotoUrl rating location locationUpdatedAt');

    if (!booking) throw httpError(404, 'This link is not valid');

    const customerName = booking.customer?.fullname?.firstname;

    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
        return { status: booking.status, active: false, customerName };
    }

    return {
        status: booking.status,
        active: true,
        customerName,
        driver: {
            fullname: booking.driver.fullname,
            profilePhotoUrl: booking.driver.profilePhotoUrl,
            rating: booking.driver.rating
        },
        vehicle: booking.vehicle,
        pickup: booking.pickup,
        destination: booking.destination,
        startTime: booking.startTime,
        endTime: booking.endTime,
        tripStartedAt: booking.tripStartedAt,
        driverLocation: TRACKING_STATUSES.includes(booking.status) ? locationOf(booking.driver) : undefined
    };
}

// ---------- SOS ----------

const SOS_STATUSES = [ ...ACTIVE_BOOKING_STATUSES, S.TRIP_COMPLETED ];
const SOS_REPEAT_MS = 2 * 60 * 1000;

module.exports.raiseSos = async (role, account, bookingId, { lat, lng } = {}) => {
    const booking = await bookingModel.findOne({ _id: bookingId, [ role ]: account._id });

    if (!booking) throw httpError(404, 'Booking not found');
    if (!SOS_STATUSES.includes(booking.status)) {
        throw httpError(409, 'SOS is available from the time the driver accepts until the trip is paid for');
    }

    const location = typeof lat === 'number' && typeof lng === 'number' ? { type: 'Point', coordinates: [ lng, lat ] } : undefined;

    // Pressing the button again within a couple of minutes updates the same alert.
    let alert = await sosAlertModel.findOne({
        booking: booking._id, raisedByRole: role, status: 'open', createdAt: { $gte: new Date(Date.now() - SOS_REPEAT_MS) }
    });

    if (!alert) {
        alert = await sosAlertModel.create({
            booking: booking._id, raisedByRole: role, customer: booking.customer, driver: booking.driver, location
        });
    } else if (location) {
        alert.location = location;
        await alert.save();
    }

    emitToAdmins('admin:alert', { type: 'sos', message: `SOS raised by ${account.fullname.firstname} (${role})` });
    return alert;
}
