const crypto = require('crypto');
const bookingModel = require('../models/booking.model');
const driverModel = require('../models/driver.model');
const userModel = require('../models/user.model');
const reviewModel = require('../models/review.model');
const { BOOKING_TYPES, BOOKING_STATUS: S, ACTIVE_BOOKING_STATUSES, TRACKING_STATUSES } = require('../config/constants');
const { bookingRequestTimeoutMs, maxOtpAttempts } = require('../config/env');
const { resolvePlace, estimateRoute } = require('./maps.service');
const { endOfBooking, reserveSlots, releaseSlots } = require('./availability.service');
const { searchAvailableDrivers } = require('./driver.service');
const { overtimeCharges, withCommission } = require('./pricing.service');
const { emitToAccount } = require('../socket');
const notifications = require('./notification.service');
const { locationOf } = require('./tracking.service');
const httpError = require('../utils/httpError');

const OTP_LOCK_MS = 15 * 60 * 1000;

const generateOtp = () => crypto.randomInt(1000, 10000).toString();

// ---------- Views: each side sees only what it needs ----------

const CUSTOMER_FIELDS = 'fullname phone rating';
const DRIVER_FIELDS = 'fullname phone profilePhotoUrl rating experienceYears languages location locationUpdatedAt';

// Contact details are shared once the driver has accepted, and stop being shown once the booking is over.
const CONTACT_STATUSES = [ ...ACTIVE_BOOKING_STATUSES, S.TRIP_COMPLETED ];

// The driver's position is only passed on while the customer may follow them.
const takeDriverLocation = (view) => {
    const location = locationOf(view.driver);

    if (view.driver) {
        delete view.driver.location;
        delete view.driver.locationUpdatedAt;
    }

    return TRACKING_STATUSES.includes(view.status) ? location : undefined;
}

const toCustomerView = (booking) => {
    const view = booking.toJSON();
    view.driverLocation = takeDriverLocation(view);

    if (view.driver && !CONTACT_STATUSES.includes(view.status)) {
        delete view.driver.phone;
    }

    // The start OTP is shown until the trip starts, the end OTP while it is running.
    if (!ACTIVE_BOOKING_STATUSES.includes(view.status) || view.status === S.TRIP_STARTED) delete view.startOtp;
    if (view.status !== S.TRIP_STARTED) delete view.endOtp;

    return view;
}

const toDriverView = (booking) => {
    const view = booking.toJSON();
    takeDriverLocation(view);
    delete view.startOtp;
    delete view.endOtp;

    if (view.customer && !CONTACT_STATUSES.includes(view.status)) {
        delete view.customer.phone;
    }

    return view;
}

module.exports.toCustomerView = toCustomerView;
module.exports.toDriverView = toDriverView;

const populateBooking = (query) => query
    .select('+startOtp +endOtp')
    .populate('customer', CUSTOMER_FIELDS)
    .populate('driver', DRIVER_FIELDS);

const loadBooking = (id) => populateBooking(bookingModel.findById(id));

// Tells both sides about a change, each with their own view of the booking and, when the change
// was made by someone else, a message for them. New requests reach the driver as 'booking:request'.
const notify = (booking, messages = {}, driverEvent = 'booking:updated') => {
    const customerId = booking.customer?._id || booking.customer;
    const driverId = booking.driver?._id || booking.driver;

    emitToAccount('customer', customerId, 'booking:updated', { message: messages.customer, booking: toCustomerView(booking) });
    emitToAccount('driver', driverId, driverEvent, { message: messages.driver, booking: toDriverView(booking) });

    if (messages.customer) notifications.push('customer', customerId, messages.customer, booking._id);
    if (messages.driver) notifications.push('driver', driverId, messages.driver, booking._id);
}

// ---------- Search and create ----------

// Geocodes the places and works out the booking window and road estimate.
const prepareDetails = async (input) => {
    const pickup = await resolvePlace(input.pickup);
    const destination = input.destination ? await resolvePlace(input.destination) : undefined;
    const duration = { value: input.duration, unit: BOOKING_TYPES[ input.bookingType ].unit };

    return {
        ...input,
        pickup,
        destination,
        duration,
        endTime: endOfBooking(input.startTime, duration),
        routeEstimate: destination ? await estimateRoute(pickup, destination) : undefined
    };
}

module.exports.searchDrivers = async (input) => {
    const details = await prepareDetails(input);
    const drivers = await searchAvailableDrivers(details);

    return {
        startTime: details.startTime,
        endTime: details.endTime,
        duration: details.duration,
        routeEstimate: details.routeEstimate,
        drivers
    };
}

module.exports.createBooking = async (customer, input) => {
    const details = await prepareDetails(input);

    // Re-run the search so every rule (verified, online, radius, vehicle, free time, price) is re-checked.
    const available = await searchAvailableDrivers({ ...details, filters: {}, sort: 'recommended' });
    const driver = available.find(candidate => candidate._id.toString() === input.driverId);

    if (!driver) {
        throw httpError(409, 'This driver is no longer available for this booking. Please choose another driver.');
    }

    // The driver always gets the full time to answer, even when the booking starts very soon.
    const requestExpiresAt = new Date(Date.now() + bookingRequestTimeoutMs);

    const created = await bookingModel.create({
        customer: customer._id,
        driver: driver._id,
        bookingType: details.bookingType,
        tripType: details.bookingType === 'outstation' ? details.tripType : undefined,
        pickup: details.pickup,
        destination: details.destination,
        startTime: details.startTime,
        endTime: details.endTime,
        duration: details.duration,
        routeEstimate: details.routeEstimate || undefined,
        vehicle: details.vehicle,
        notes: details.notes,
        pricing: driver.price,
        status: S.REQUESTED,
        statusHistory: [ { status: S.REQUESTED } ],
        requestExpiresAt,
        startOtp: generateOtp(),
        endOtp: generateOtp()
    });

    const booking = await loadBooking(created._id);
    notify(booking, { driver: `New booking request from ${customer.fullname.firstname}` }, 'booking:request');
    return booking;
}

// ---------- Status transitions ----------

// Moves a booking from one of `from` to `to` in a single atomic update, so two actions can never both win.
const transition = async (filter, from, to, extra = {}) => {
    const updated = await populateBooking(bookingModel.findOneAndUpdate(
        { ...filter, status: { $in: from } },
        { $set: { status: to, ...extra }, $push: { statusHistory: { status: to, at: new Date() } } },
        { new: true }
    ));

    if (!updated) {
        const existing = await bookingModel.findOne(filter).select('status');

        if (!existing) {
            throw httpError(404, 'Booking not found');
        }

        throw httpError(409, `This booking is ${existing.status.replace(/_/g, ' ')} and cannot be changed this way`);
    }

    return updated;
}

module.exports.acceptBooking = async (driver, bookingId) => {
    const booking = await bookingModel.findOne({ _id: bookingId, driver: driver._id });

    if (!booking) {
        throw httpError(404, 'Booking not found');
    }

    if (booking.status !== S.REQUESTED) {
        throw httpError(409, `This booking is ${booking.status.replace(/_/g, ' ')}`);
    }

    if (booking.requestExpiresAt <= new Date()) {
        throw httpError(409, 'This request has expired');
    }

    try {
        await reserveSlots(booking);
    } catch (err) {
        if (err.statusCode === 409) {
            // The driver took another booking for this time in the meantime.
            const rejected = await transition({ _id: bookingId }, [ S.REQUESTED ], S.DRIVER_REJECTED, {
                rejectionReason: 'Driver is no longer available at this time'
            }).catch(() => null);
            if (rejected) notify(rejected, { customer: 'The driver is no longer available. Please choose another driver.' });
        }
        throw err;
    }

    try {
        const accepted = await transition({ _id: bookingId, driver: driver._id, requestExpiresAt: { $gt: new Date() } }, [ S.REQUESTED ], S.DRIVER_ACCEPTED);
        await driverModel.updateOne({ _id: driver._id }, { $inc: { 'stats.acceptedBookings': 1 } });
        notify(accepted, { customer: `${driver.fullname.firstname} accepted your booking` });
        return accepted;
    } catch (err) {
        // Cancelled or expired while we were reserving.
        await releaseSlots(booking._id);
        throw err;
    }
}

module.exports.rejectBooking = async (driver, bookingId, reason) => {
    const booking = await transition({ _id: bookingId, driver: driver._id }, [ S.REQUESTED ], S.DRIVER_REJECTED, {
        rejectionReason: reason || 'Driver is unavailable'
    });
    notify(booking, { customer: `${driver.fullname.firstname} could not take this booking. Please choose another driver.` });
    return booking;
}

module.exports.markOnTheWay = async (driver, bookingId) => {
    const booking = await transition({ _id: bookingId, driver: driver._id }, [ S.DRIVER_ACCEPTED ], S.DRIVER_ON_THE_WAY);
    notify(booking, { customer: `${driver.fullname.firstname} is on the way` });
    return booking;
}

module.exports.markArrived = async (driver, bookingId) => {
    const booking = await transition({ _id: bookingId, driver: driver._id }, [ S.DRIVER_ACCEPTED, S.DRIVER_ON_THE_WAY ], S.DRIVER_ARRIVED);
    notify(booking, { customer: `${driver.fullname.firstname} has arrived at the pickup` });
    return booking;
}

// Checks an OTP the customer read out, with a lock after repeated wrong attempts.
const verifyOtp = async (bookingId, driverId, field, otp) => {
    const booking = await bookingModel.findOne({ _id: bookingId, driver: driverId }).select(`+${field} +otpAttempts`);

    if (!booking) {
        throw httpError(404, 'Booking not found');
    }

    if (booking.otpLockedUntil > new Date()) {
        const minutes = Math.ceil((booking.otpLockedUntil - Date.now()) / 60000);
        throw httpError(429, `Too many wrong OTPs. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
    }

    if (booking[ field ] !== otp) {
        const attempts = (booking.otpAttempts || 0) + 1;
        const lock = attempts >= maxOtpAttempts;
        await bookingModel.updateOne({ _id: bookingId }, lock
            ? { $set: { otpAttempts: 0, otpLockedUntil: new Date(Date.now() + OTP_LOCK_MS) } }
            : { $set: { otpAttempts: attempts } });
        throw httpError(400, 'Wrong OTP. Ask the customer for the OTP shown in their app.');
    }

    await bookingModel.updateOne({ _id: bookingId }, { $set: { otpAttempts: 0 }, $unset: { otpLockedUntil: 1 } });
}

module.exports.startTrip = async (driver, bookingId, otp) => {
    const current = await bookingModel.findOne({ _id: bookingId, driver: driver._id }).select('status');

    if (current && !ACTIVE_BOOKING_STATUSES.slice(0, 3).includes(current.status)) {
        throw httpError(409, `This booking is ${current.status.replace(/_/g, ' ')} and cannot be started`);
    }

    await verifyOtp(bookingId, driver._id, 'startOtp', otp);

    const booking = await transition({ _id: bookingId, driver: driver._id },
        [ S.DRIVER_ACCEPTED, S.DRIVER_ON_THE_WAY, S.DRIVER_ARRIVED ], S.TRIP_STARTED, { tripStartedAt: new Date() });
    notify(booking, { customer: 'Your trip has started' });
    return booking;
}

module.exports.completeTrip = async (driver, bookingId, otp) => {
    const current = await bookingModel.findOne({ _id: bookingId, driver: driver._id });

    if (current && current.status !== S.TRIP_STARTED) {
        throw httpError(409, `This booking is ${current.status.replace(/_/g, ' ')} and cannot be completed`);
    }

    await verifyOtp(bookingId, driver._id, 'endOtp', otp);

    const completedAt = new Date();
    const extraCharges = overtimeCharges(current, driver, completedAt);
    const pricing = withCommission({ ...current.toObject().pricing, extraCharges });

    const booking = await transition({ _id: bookingId, driver: driver._id }, [ S.TRIP_STARTED ], S.TRIP_COMPLETED, {
        tripCompletedAt: completedAt,
        pricing
    });

    // The driver is free from now on, including the rest of the current hour.
    await releaseSlots(booking._id);

    notify(booking, { customer: `Trip completed. Please pay ₹${pricing.driverCharges} to your driver.` });
    return booking;
}

module.exports.confirmCashPayment = async (driver, bookingId) => {
    const booking = await transition({ _id: bookingId, driver: driver._id }, [ S.TRIP_COMPLETED ], S.PAYMENT_COMPLETED, {
        'payment.status': 'paid',
        'payment.paidAt': new Date()
    });

    await driverModel.updateOne({ _id: driver._id }, {
        $inc: { 'stats.completedTrips': 1, 'stats.totalEarnings': booking.pricing.driverEarning }
    });

    notify(booking, { customer: 'Payment received. Please rate your driver.' });
    return booking;
}

const CANCELLABLE = [ S.REQUESTED, S.DRIVER_ACCEPTED, S.DRIVER_ON_THE_WAY, S.DRIVER_ARRIVED ];

module.exports.cancelByCustomer = async (customer, bookingId, reason) => {
    const booking = await transition({ _id: bookingId, customer: customer._id }, CANCELLABLE, S.CANCELLED, {
        cancellation: { by: 'customer', reason }
    });
    await releaseSlots(booking._id);
    notify(booking, { driver: `${customer.fullname.firstname} cancelled the booking` });
    return booking;
}

module.exports.cancelByDriver = async (driver, bookingId, reason) => {
    const booking = await transition({ _id: bookingId, driver: driver._id }, CANCELLABLE.slice(1), S.CANCELLED, {
        cancellation: { by: 'driver', reason }
    });
    await releaseSlots(booking._id);
    await driverModel.updateOne({ _id: driver._id }, { $inc: { 'stats.cancelledByDriver': 1 } });
    notify(booking, { customer: `${driver.fullname.firstname} cancelled the booking. Please book another driver.` });
    return booking;
}

// Requests no driver answered in time. Runs periodically, so it also catches up after a restart.
module.exports.expireStaleRequests = async () => {
    const stale = await bookingModel.find({ status: S.REQUESTED, requestExpiresAt: { $lte: new Date() } }).select('_id');

    for (const { _id } of stale) {
        const booking = await transition({ _id, requestExpiresAt: { $lte: new Date() } }, [ S.REQUESTED ], S.EXPIRED).catch(() => null);
        if (booking) {
            notify(booking, {
                customer: 'The driver did not respond in time. Please choose another driver.',
                driver: 'A booking request expired because it was not answered in time'
            });
        }
    }

    return stale.length;
}

// Accepted bookings whose whole time window passed without the trip ever starting.
module.exports.closeMissedBookings = async () => {
    const missed = await bookingModel.find({ status: { $in: CANCELLABLE.slice(1) }, endTime: { $lte: new Date() } }).select('_id');

    for (const { _id } of missed) {
        const booking = await transition({ _id, endTime: { $lte: new Date() } }, CANCELLABLE.slice(1), S.CANCELLED, {
            cancellation: { by: 'system', reason: 'The trip was not started in the booked time' }
        }).catch(() => null);

        if (booking) {
            await releaseSlots(booking._id);
            const message = 'A booking was closed because the trip did not start in the booked time';
            notify(booking, { customer: message, driver: message });
        }
    }

    return missed.length;
}

// Support can cancel any booking that has not started yet.
module.exports.cancelByAdmin = async (bookingId, reason) => {
    const booking = await transition({ _id: bookingId }, CANCELLABLE, S.CANCELLED, {
        cancellation: { by: 'admin', reason }
    });
    await releaseSlots(booking._id);

    const message = `Support cancelled a booking: ${reason}`;
    notify(booking, { customer: message, driver: message });
    return booking;
}

// ---------- Reviews ----------

const createReview = async (review) => {
    try {
        return await reviewModel.create(review);
    } catch (err) {
        if (err.code === 11000) throw httpError(409, 'You have already rated this trip');
        throw err;
    }
}

module.exports.reviewDriver = async (customer, bookingId, { rating, comment }) => {
    const booking = await bookingModel.findOne({ _id: bookingId, customer: customer._id });

    if (!booking) throw httpError(404, 'Booking not found');
    if (booking.status !== S.PAYMENT_COMPLETED) throw httpError(409, 'You can rate the driver once the trip is paid for');

    const review = await createReview({
        booking: booking._id, fromRole: 'customer', customer: customer._id, driver: booking.driver, rating, comment
    });
    await driverModel.addRating(booking.driver, rating);

    const updated = await transition({ _id: bookingId }, [ S.PAYMENT_COMPLETED ], S.RATING_COMPLETED, { customerReview: review._id });
    notify(updated, { driver: `${customer.fullname.firstname} rated the trip ${rating}★` });
    return updated;
}

module.exports.reviewCustomer = async (driver, bookingId, { rating, comment }) => {
    const booking = await bookingModel.findOne({ _id: bookingId, driver: driver._id });

    if (!booking) throw httpError(404, 'Booking not found');
    if (![ S.TRIP_COMPLETED, S.PAYMENT_COMPLETED, S.RATING_COMPLETED ].includes(booking.status)) {
        throw httpError(409, 'You can rate the customer once the trip is completed');
    }

    const review = await createReview({
        booking: booking._id, fromRole: 'driver', customer: booking.customer, driver: driver._id, rating, comment
    });
    await userModel.addRating(booking.customer, rating);
    await bookingModel.updateOne({ _id: bookingId }, { driverReview: review._id });

    return loadBooking(bookingId);
}

// ---------- Reading ----------

const SCOPES = {
    customer: {
        requests: [ S.REQUESTED ],
        upcoming: [ S.REQUESTED, S.DRIVER_ACCEPTED, S.DRIVER_ON_THE_WAY, S.DRIVER_ARRIVED ],
        active: [ S.TRIP_STARTED, S.TRIP_COMPLETED ],
        past: [ S.PAYMENT_COMPLETED, S.RATING_COMPLETED, S.CANCELLED, S.DRIVER_REJECTED, S.EXPIRED ]
    },
    driver: {
        requests: [ S.REQUESTED ],
        upcoming: [ S.DRIVER_ACCEPTED, S.DRIVER_ON_THE_WAY, S.DRIVER_ARRIVED ],
        active: [ S.TRIP_STARTED, S.TRIP_COMPLETED ],
        past: [ S.PAYMENT_COMPLETED, S.RATING_COMPLETED, S.CANCELLED, S.DRIVER_REJECTED, S.EXPIRED ]
    }
};

module.exports.listBookings = async (role, accountId, scope) => {
    const filter = { [ role ]: accountId };

    if (scope !== 'all') {
        filter.status = { $in: SCOPES[ role ][ scope ] };
    }

    const upcomingFirst = [ 'requests', 'upcoming', 'active' ].includes(scope);
    const bookings = await populateBooking(bookingModel.find(filter))
        .sort(upcomingFirst ? { startTime: 1 } : { createdAt: -1 })
        .limit(100);

    return bookings.map(role === 'customer' ? toCustomerView : toDriverView);
}

module.exports.getBooking = async (role, accountId, bookingId) => {
    const booking = await loadBooking(bookingId);

    if (!booking || booking[ role ]?._id.toString() !== accountId.toString()) {
        throw httpError(404, 'Booking not found');
    }

    return role === 'customer' ? toCustomerView(booking) : toDriverView(booking);
}

const startOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

module.exports.getDriverDashboard = async (driver) => {
    const [ today ] = await bookingModel.aggregate([
        { $match: { driver: driver._id, 'payment.status': 'paid', 'payment.paidAt': { $gte: startOfToday() } } },
        { $group: { _id: null, earnings: { $sum: '$pricing.driverEarning' }, trips: { $sum: 1 } } }
    ]);

    const [ pendingRequests, upcomingBookings, activeBookings ] = await Promise.all([
        bookingModel.countDocuments({ driver: driver._id, status: S.REQUESTED }),
        bookingModel.countDocuments({ driver: driver._id, status: { $in: SCOPES.driver.upcoming } }),
        bookingModel.countDocuments({ driver: driver._id, status: { $in: SCOPES.driver.active } })
    ]);

    return {
        isOnline: driver.isOnline,
        verificationStatus: driver.verification.status,
        todayEarnings: today?.earnings || 0,
        todayTrips: today?.trips || 0,
        pendingRequests,
        upcomingBookings,
        activeBookings,
        totalEarnings: driver.stats.totalEarnings,
        completedTrips: driver.stats.completedTrips,
        rating: driver.rating
    };
}
