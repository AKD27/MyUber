const userModel = require('../models/user.model');
const driverModel = require('../models/driver.model');
const bookingModel = require('../models/booking.model');
const { DRIVER_VERIFICATION } = require('../config/constants');
const { missingProfileFields } = require('./driver.service');
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

module.exports.getStats = async () => {
    const today = startOfToday();

    const [ totalCustomers, totalDrivers, activeDrivers, pendingVerifications, todaysBookings, [ revenue ] ] = await Promise.all([
        userModel.countDocuments({ role: 'customer' }),
        driverModel.countDocuments(),
        driverModel.countDocuments({ isOnline: true, 'verification.status': DRIVER_VERIFICATION.VERIFIED, accountStatus: 'active' }),
        driverModel.countDocuments({ 'verification.status': DRIVER_VERIFICATION.UNDER_REVIEW }),
        bookingModel.countDocuments({ createdAt: { $gte: today } }),
        bookingModel.aggregate([
            { $match: { 'payment.status': 'paid', 'payment.paidAt': { $gte: today } } },
            { $group: { _id: null, gross: { $sum: '$pricing.driverCharges' }, commission: { $sum: '$pricing.platformCommission' } } }
        ])
    ]);

    return {
        totalCustomers,
        totalDrivers,
        activeDrivers,
        pendingVerifications,
        todaysBookings,
        todaysBookingValue: revenue?.gross || 0,
        todaysRevenue: revenue?.commission || 0
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

    return { driver, missingFields: missingProfileFields(driver), recentBookings };
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

