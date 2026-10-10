const mongoose = require('mongoose');
const { COMPLAINT_CATEGORIES, COMPLAINT_STATUS } = require('../config/constants');

// An issue a customer or driver reports to the platform, usually about one booking.
const complaintSchema = new mongoose.Schema({
    raisedByRole: { type: String, enum: [ 'customer', 'driver' ], required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'driver' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'booking' },
    category: { type: String, enum: COMPLAINT_CATEGORIES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: COMPLAINT_STATUS, default: 'open', index: true },
    resolutionNote: { type: String, trim: true, maxlength: 1000 },
    resolvedAt: Date
}, { timestamps: true });

complaintSchema.index({ customer: 1, createdAt: -1 });
complaintSchema.index({ driver: 1, createdAt: -1 });

module.exports = mongoose.model('complaint', complaintSchema);
