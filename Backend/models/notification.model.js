const mongoose = require('mongoose');

// A message for one customer or driver, kept so it can be read later in the app.
const notificationSchema = new mongoose.Schema({
    recipientRole: { type: String, enum: [ 'customer', 'driver' ], required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, required: true },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'booking' },
    readAt: Date
}, { timestamps: true });

notificationSchema.index({ recipientRole: 1, recipient: 1, createdAt: -1 });
// Old notifications are removed automatically after 60 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model('notification', notificationSchema);
