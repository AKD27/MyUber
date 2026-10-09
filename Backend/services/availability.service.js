const driverSlotModel = require('../models/driverSlot.model');
const httpError = require('../utils/httpError');

const HOUR_MS = 60 * 60 * 1000;

const endOfBooking = (startTime, duration) =>
    new Date(startTime.getTime() + duration.value * (duration.unit === 'days' ? 24 : 1) * HOUR_MS);

// Every clock hour the booking touches, e.g. 10:30–12:30 → 10:00, 11:00, 12:00.
const hoursCovered = (startTime, endTime) => {
    const hours = [];
    for (let t = Math.floor(startTime.getTime() / HOUR_MS) * HOUR_MS; t < endTime.getTime(); t += HOUR_MS) {
        hours.push(new Date(t));
    }
    return hours;
}

// Drivers (of the given ids) who already have any of these hours booked.
const busyDriverIds = async (driverIds, startTime, endTime) => {
    const ids = await driverSlotModel.distinct('driver', {
        driver: { $in: driverIds },
        hour: { $in: hoursCovered(startTime, endTime) }
    });
    return new Set(ids.map(id => id.toString()));
}

// Reserves the booking's hours for its driver. The unique (driver, hour) index makes this safe
// against two bookings being accepted at the same time; on conflict nothing stays reserved.
const reserveSlots = async (booking) => {
    const slots = hoursCovered(booking.startTime, booking.endTime).map(hour => ({
        driver: booking.driver, hour, booking: booking._id
    }));

    try {
        await driverSlotModel.insertMany(slots, { ordered: false });
    } catch (err) {
        await driverSlotModel.deleteMany({ booking: booking._id });

        if (err.code === 11000 || err.writeErrors?.some(e => e.code === 11000)) {
            throw httpError(409, 'The driver is already booked during this time');
        }
        throw err;
    }
}

// Frees reserved hours: all of them, or only those from `fromTime` on (e.g. a trip that ended early).
const releaseSlots = (bookingId, fromTime) => {
    const filter = { booking: bookingId };

    if (fromTime) {
        filter.hour = { $gte: new Date(Math.ceil(fromTime.getTime() / HOUR_MS) * HOUR_MS) };
    }

    return driverSlotModel.deleteMany(filter);
}

module.exports = { endOfBooking, hoursCovered, busyDriverIds, reserveSlots, releaseSlots };
