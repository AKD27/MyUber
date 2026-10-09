const adminService = require('../services/admin.service');

module.exports.getStats = async (req, res) => res.status(200).json(await adminService.getStats());

module.exports.listDrivers = async (req, res) => res.status(200).json(await adminService.listDrivers(req.validated.query));

module.exports.getDriver = async (req, res) => res.status(200).json(await adminService.getDriver(req.validated.params.id));

module.exports.setDriverVerification = async (req, res) =>
    res.status(200).json(await adminService.setDriverVerification(req.validated.params.id, req.validated.body));

module.exports.setDriverAccountStatus = async (req, res) =>
    res.status(200).json(await adminService.setDriverAccountStatus(req.validated.params.id, req.validated.body.accountStatus));

module.exports.listCustomers = async (req, res) => res.status(200).json(await adminService.listCustomers(req.validated.query));

module.exports.setCustomerAccountStatus = async (req, res) =>
    res.status(200).json(await adminService.setCustomerAccountStatus(req.validated.params.id, req.validated.body.accountStatus));

module.exports.listBookings = async (req, res) => res.status(200).json(await adminService.listBookings(req.validated.query));
