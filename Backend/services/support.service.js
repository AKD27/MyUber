const complaintModel = require('../models/complaint.model');
const bookingModel = require('../models/booking.model');
const { emitToAdmins } = require('../socket');
const httpError = require('../utils/httpError');

const BOOKING_FIELDS = 'bookingType startTime pickup.address status';

// A customer or driver reports an issue, optionally about one of their own bookings.
module.exports.createComplaint = async (role, account, { bookingId, category, description }) => {
    const complaint = { raisedByRole: role, [ role ]: account._id, category, description };

    if (bookingId) {
        const booking = await bookingModel.findOne({ _id: bookingId, [ role ]: account._id }).select('customer driver');

        if (!booking) throw httpError(404, 'Booking not found');

        complaint.booking = booking._id;
        complaint.customer = booking.customer;
        complaint.driver = booking.driver;
    }

    const created = await complaintModel.create(complaint);

    emitToAdmins('admin:alert', { type: 'complaint', message: `New complaint from ${account.fullname.firstname} (${role})` });
    return created;
}

// Complaints the account raised itself, newest first.
module.exports.listOwnComplaints = (role, accountId) =>
    complaintModel.find({ raisedByRole: role, [ role ]: accountId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('booking', BOOKING_FIELDS);
