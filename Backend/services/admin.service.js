const userModel = require('../models/user.model');
const driverModel = require('../models/driver.model');
const bookingModel = require('../models/booking.model');
const complaintModel = require('../models/complaint.model');
const sosAlertModel = require('../models/sosAlert.model');
const { DRIVER_VERIFICATION } = require('../config/constants');
const { appTimezone } = require('../config/env');
const { localDay } = require('../utils/localTime');
const { missingProfileFields } = require('./driver.service');
const notifications = require('./notification.service');
const { emitToAccount } = require('../socket');
const httpError = require('../utils/httpError');

const PAGE_SIZE = 20;

const startOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchFilter = (search) => {
    if (!search) return {};
    const pattern = new RegExp(escapeRegex(search), 'i');
    return { $or: [ { email: pattern }, { phone: pattern }, { 'fullname.firstname': pattern }, { 'fullname.lastname': pattern } ] };
}

const paginate = async (model, filter, page, sort, populate = []) => {
    let query = model.find(filter).sort(sort).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE);
    for (const [ path, fields ] of populate) query = query.populate(path, fields);

    const [ items, total ] = await Promise.all([ query, model.countDocuments(filter) ]);
    return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 7;

const PAID = { 'payment.status': 'paid' };
const MONEY_SUMS = {
    gross: { $sum: '$pricing.driverCharges' },
    commission: { $sum: '$pricing.platformCommission' },
    net: { $sum: '$pricing.driverEarning' },
    trips: { $sum: 1 }
};

const byLocalDay = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: appTimezone } });

// Bookings created and commission earned on each of the last few days, oldest first.
const dailySeries = async () => {
    const since = new Date(Date.now() - (CHART_DAYS + 1) * DAY_MS);

    const [ created, paid ] = await Promise.all([
        bookingModel.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: byLocalDay('$createdAt'), bookings: { $sum: 1 } } }
        ]),
        bookingModel.aggregate([
            { $match: { ...PAID, 'payment.paidAt': { $gte: since } } },
            { $group: { _id: byLocalDay('$payment.paidAt'), revenue: { $sum: '$pricing.platformCommission' } } }
        ])
    ]);

    const bookings = new Map(created.map(day => [ day._id, day.bookings ]));
    const revenue = new Map(paid.map(day => [ day._id, day.revenue ]));

    return Array.from({ length: CHART_DAYS }, (_, i) => {
        const date = localDay(new Date(Date.now() - (CHART_DAYS - 1 - i) * DAY_MS));
        return { date, bookings: bookings.get(date) || 0, revenue: revenue.get(date) || 0 };
    });
}

module.exports.getStats = async () => {
    const today = startOfToday();

    const [ totalCustomers, totalDrivers, activeDrivers, pendingVerifications, todaysBookings, [ revenue ],
        totalBookings, [ allTime ], openComplaints, openSosAlerts, last7Days ] = await Promise.all([
        userModel.countDocuments({ role: 'customer' }),
        driverModel.countDocuments(),
        driverModel.countDocuments({ isOnline: true, 'verification.status': DRIVER_VERIFICATION.VERIFIED, accountStatus: 'active' }),
        driverModel.countDocuments({ 'verification.status': DRIVER_VERIFICATION.UNDER_REVIEW }),
        bookingModel.countDocuments({ createdAt: { $gte: today } }),
        bookingModel.aggregate([
            { $match: { 'payment.status': 'paid', 'payment.paidAt': { $gte: today } } },
            { $group: { _id: null, gross: { $sum: '$pricing.driverCharges' }, commission: { $sum: '$pricing.platformCommission' } } }
        ]),
        bookingModel.countDocuments(),
        bookingModel.aggregate([ { $match: PAID }, { $group: { _id: null, ...MONEY_SUMS } } ]),
        complaintModel.countDocuments({ status: { $ne: 'resolved' } }),
        sosAlertModel.countDocuments({ status: 'open' }),
        dailySeries()
    ]);

    return {
        totalCustomers,
        totalDrivers,
        activeDrivers,
        pendingVerifications,
        todaysBookings,
        todaysBookingValue: revenue?.gross || 0,
        todaysRevenue: revenue?.commission || 0,
        totalBookings,
        completedTrips: allTime?.trips || 0,
        totalBookingValue: allTime?.gross || 0,
        totalRevenue: allTime?.commission || 0,
        openComplaints,
        openSosAlerts,
        last7Days
    };
}

module.exports.listDrivers = ({ verificationStatus, accountStatus, search, page }) => {
    const filter = searchFilter(search);
    if (verificationStatus) filter[ 'verification.status' ] = verificationStatus;
    if (accountStatus) filter.accountStatus = accountStatus;

    // Drivers waiting for review come first, oldest submission first.
    const sort = verificationStatus === DRIVER_VERIFICATION.UNDER_REVIEW ? { 'verification.submittedAt': 1 } : { createdAt: -1 };
    return paginate(driverModel, filter, page, sort);
}

module.exports.getDriver = async (id) => {
    const driver = await driverModel.findById(id);

    if (!driver) {
        throw httpError(404, 'Driver not found');
    }

    const recentBookings = await bookingModel.find({ driver: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('customer', 'fullname phone');

    const [ earnings ] = await bookingModel.aggregate([ { $match: { driver: driver._id, ...PAID } }, { $group: { _id: null, ...MONEY_SUMS } } ]);
    const complaints = await complaintModel.countDocuments({ driver: id, raisedByRole: 'customer' });

    return {
        driver,
        missingFields: missingProfileFields(driver),
        recentBookings,
        earnings: { gross: earnings?.gross || 0, commission: earnings?.commission || 0, net: earnings?.net || 0, trips: earnings?.trips || 0 },
        complaints
    };
}

module.exports.setDriverVerification = async (id, { status, note }) => {
    const driver = await driverModel.findById(id);

    if (!driver) {
        throw httpError(404, 'Driver not found');
    }

    if (status === DRIVER_VERIFICATION.VERIFIED) {
        const missing = missingProfileFields(driver);
        if (missing.length) {
            throw httpError(400, `This profile is incomplete: ${missing.join(', ')}`);
        }
    }

    driver.verification.status = status;
    driver.verification.note = note;
    driver.verification.reviewedAt = new Date();

    // Only verified drivers may take bookings.
    if (status !== DRIVER_VERIFICATION.VERIFIED) {
        driver.isOnline = false;
    }

    await driver.save();

    emitToAccount('driver', driver._id, 'account:updated', {
        message: status === DRIVER_VERIFICATION.VERIFIED
            ? 'Your profile is verified. You can go online and receive bookings.'
            : status === DRIVER_VERIFICATION.REJECTED
                ? `Your verification was rejected: ${note}`
                : 'Your profile is under review.',
        verification: driver.verification
    });

    return driver;
}

module.exports.setDriverAccountStatus = async (id, accountStatus) => {
    const driver = await driverModel.findByIdAndUpdate(id,
        accountStatus === 'suspended' ? { accountStatus, isOnline: false } : { accountStatus },
        { new: true });

    if (!driver) {
        throw httpError(404, 'Driver not found');
    }

    return driver;
}

module.exports.listCustomers = ({ accountStatus, search, page }) => {
    const filter = { role: 'customer', ...searchFilter(search) };
    if (accountStatus) filter.accountStatus = accountStatus;
    return paginate(userModel, filter, page, { createdAt: -1 });
}

module.exports.getCustomer = async (id) => {
    const customer = await userModel.findOne({ _id: id, role: 'customer' });

    if (!customer) {
        throw httpError(404, 'Customer not found');
    }

    const [ recentBookings, totalBookings, [ paid ], complaints ] = await Promise.all([
        bookingModel.find({ customer: id }).sort({ createdAt: -1 }).limit(10).populate('driver', 'fullname phone'),
        bookingModel.countDocuments({ customer: id }),
        bookingModel.aggregate([ { $match: { customer: customer._id, ...PAID } }, { $group: { _id: null, ...MONEY_SUMS } } ]),
        complaintModel.countDocuments({ customer: id, raisedByRole: 'driver' })
    ]);

    return { customer, recentBookings, totalBookings, paidTrips: paid?.trips || 0, totalSpent: paid?.gross || 0, complaints };
}

module.exports.setCustomerAccountStatus = async (id, accountStatus) => {
    const customer = await userModel.findOneAndUpdate({ _id: id, role: 'customer' }, { accountStatus }, { new: true });

    if (!customer) {
        throw httpError(404, 'Customer not found');
    }

    return customer;
}

module.exports.listBookings = ({ status, page }) => {
    const filter = status ? { status } : {};
    return paginate(bookingModel, filter, page, { createdAt: -1 }, [
        [ 'customer', 'fullname phone email' ],
        [ 'driver', 'fullname phone email' ]
    ]);
}


const PEOPLE = [
    [ 'customer', 'fullname phone email' ],
    [ 'driver', 'fullname phone email' ]
];

module.exports.getBooking = async (id) => {
    const booking = await bookingModel.findById(id).populate('customer', 'fullname phone email').populate('driver', 'fullname phone email');

    if (!booking) {
        throw httpError(404, 'Booking not found');
    }

    return booking;
}

// ---------- Complaints ----------

module.exports.listComplaints = ({ status, page }) =>
    paginate(complaintModel, status ? { status } : {}, page, { createdAt: -1 }, [
        ...PEOPLE,
        [ 'booking', 'bookingType startTime pickup.address status' ]
    ]);

module.exports.updateComplaint = async (id, { status, resolutionNote }) => {
    const complaint = await complaintModel.findById(id);

    if (!complaint) {
        throw httpError(404, 'Complaint not found');
    }

    complaint.status = status;
    if (resolutionNote) complaint.resolutionNote = resolutionNote;
    complaint.resolvedAt = status === 'resolved' ? new Date() : undefined;
    await complaint.save();

    const role = complaint.raisedByRole;
    await notifications.push(role, complaint[ role ], status === 'resolved'
        ? `Your complaint was resolved: ${complaint.resolutionNote}`
        : 'Support is looking into your complaint', complaint.booking);

    return complaint;
}

// ---------- SOS alerts ----------

module.exports.listSosAlerts = ({ status, page }) =>
    paginate(sosAlertModel, status ? { status } : {}, page, { createdAt: -1 }, [
        ...PEOPLE,
        [ 'booking', 'bookingType startTime pickup destination status vehicle' ]
    ]);

module.exports.resolveSosAlert = async (id, resolutionNote) => {
    const alert = await sosAlertModel.findOneAndUpdate(
        { _id: id, status: 'open' },
        { status: 'resolved', resolutionNote, resolvedAt: new Date() },
        { new: true }
    );

    if (!alert) {
        throw httpError(404, 'This alert was not found or is already resolved');
    }

    return alert;
}
