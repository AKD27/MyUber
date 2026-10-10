const supportService = require('../services/support.service');
const notificationService = require('../services/notification.service');

module.exports.createComplaint = async (req, res) => {
    return res.status(201).json(await supportService.createComplaint(req.auth.role, req.auth.account, req.validated.body));
}

module.exports.listComplaints = async (req, res) => {
    return res.status(200).json(await supportService.listOwnComplaints(req.auth.role, req.auth.account._id));
}

module.exports.listNotifications = async (req, res) => {
    return res.status(200).json(await notificationService.list(req.auth.role, req.auth.account._id));
}

module.exports.markNotificationsRead = async (req, res) => {
    await notificationService.markAllRead(req.auth.role, req.auth.account._id);
    return res.status(200).json({ unread: 0 });
}
