const mongoose = require('mongoose');
const { pointSchema } = require('./shared/schemas');

// An emergency alert raised from a booking; admins see these immediately.
const sosAlertSchema = new mongoose.Schema({
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'booking', required: true, index: true },
    raisedByRole: { type: String, enum: [ 'customer', 'driver' ], required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'driver', required: true },
    location: { type: pointSchema },
    status: { type: String, enum: [ 'open', 'resolved' ], default: 'open', index: true },
    resolutionNote: { type: String, trim: true, maxlength: 1000 },
    resolvedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('sosAlert', sosAlertSchema);
