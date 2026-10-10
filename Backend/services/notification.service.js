const notificationModel = require('../models/notification.model');
const { emitToAccount } = require('../socket');

// Stores a message for a customer or driver and pushes it to their open tabs.
// Never throws: a failed notification must not undo the action that caused it.
module.exports.push = async (role, accountId, message, bookingId) => {
    try {
        const notification = await notificationModel.create({
            recipientRole: role, recipient: accountId, message, booking: bookingId
        });
        emitToAccount(role, accountId, 'notification:new', notification);
    } catch (err) {
        console.error('Saving a notification failed', err.message);
    }
}

module.exports.list = async (role, accountId) => {
    const filter = { recipientRole: role, recipient: accountId };

    const [ items, unread ] = await Promise.all([
        notificationModel.find(filter).sort({ createdAt: -1 }).limit(30),
        notificationModel.countDocuments({ ...filter, readAt: null })
    ]);

    return { items, unread };
}

module.exports.markAllRead = (role, accountId) =>
    notificationModel.updateMany({ recipientRole: role, recipient: accountId, readAt: null }, { readAt: new Date() });
