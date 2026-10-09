const bookingService = require('../services/booking.service');

const { toCustomerView, toDriverView } = bookingService;

const accountOf = (req) => req.auth.account;
const idOf = (req) => req.validated.params.id;

// Customer actions
module.exports.create = async (req, res) => {
    const booking = await bookingService.createBooking(accountOf(req), req.validated.body);
    return res.status(201).json(toCustomerView(booking));
}

module.exports.cancelByCustomer = async (req, res) => {
    const booking = await bookingService.cancelByCustomer(accountOf(req), idOf(req), req.validated.body.reason);
    return res.status(200).json(toCustomerView(booking));
}

module.exports.reviewDriver = async (req, res) => {
    const booking = await bookingService.reviewDriver(accountOf(req), idOf(req), req.validated.body);
    return res.status(200).json(toCustomerView(booking));
}

// Driver actions
const driverAction = (action, ...bodyFields) => async (req, res) => {
    const args = bodyFields.map(field => req.validated.body?.[ field ]);
    const booking = await bookingService[ action ](accountOf(req), idOf(req), ...args);
    return res.status(200).json(toDriverView(booking));
}

module.exports.accept = driverAction('acceptBooking');
module.exports.reject = driverAction('rejectBooking', 'reason');
module.exports.onTheWay = driverAction('markOnTheWay');
module.exports.arrived = driverAction('markArrived');
module.exports.start = driverAction('startTrip', 'otp');
module.exports.complete = driverAction('completeTrip', 'otp');
module.exports.paymentReceived = driverAction('confirmCashPayment');
module.exports.cancelByDriver = driverAction('cancelByDriver', 'reason');

module.exports.reviewCustomer = async (req, res) => {
    const booking = await bookingService.reviewCustomer(accountOf(req), idOf(req), req.validated.body);
    return res.status(200).json(toDriverView(booking));
}

// Both
module.exports.list = async (req, res) => {
    return res.status(200).json(await bookingService.listBookings(req.auth.role, accountOf(req)._id, req.validated.query.scope));
}

module.exports.get = async (req, res) => {
    return res.status(200).json(await bookingService.getBooking(req.auth.role, accountOf(req)._id, idOf(req)));
}
