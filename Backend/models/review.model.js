const mongoose = require('mongoose');

// A rating left after a booking: customers rate drivers and drivers rate customers.
const reviewSchema = new mongoose.Schema({
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'booking', required: true },
    fromRole: { type: String, enum: [ 'customer', 'driver' ], required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'driver', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });

reviewSchema.index({ booking: 1, fromRole: 1 }, { unique: true });
reviewSchema.index({ driver: 1, fromRole: 1, createdAt: -1 });

module.exports = mongoose.model('review', reviewSchema);
