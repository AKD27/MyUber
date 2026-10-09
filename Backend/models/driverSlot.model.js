const mongoose = require('mongoose');

// One document per driver per booked clock hour. The unique index makes it impossible to
// reserve the same hour twice, which is what prevents double booking without transactions.
const driverSlotSchema = new mongoose.Schema({
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'driver', required: true },
    hour: { type: Date, required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'booking', required: true, index: true }
});

driverSlotSchema.index({ driver: 1, hour: 1 }, { unique: true });

module.exports = mongoose.model('driverAvailability', driverSlotSchema, 'driverAvailability');
