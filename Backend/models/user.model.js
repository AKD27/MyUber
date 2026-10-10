const mongoose = require('mongoose');
const accountPlugin = require('./shared/account.plugin');
const { placeSchema } = require('./shared/schemas');

// Customers and platform admins.
const userSchema = new mongoose.Schema({
    role: { type: String, enum: [ 'customer', 'admin' ], default: 'customer' },
    emergencyContact: {
        name: { type: String, trim: true },
        phone: { type: String, trim: true }
    },
    savedLocations: [ new mongoose.Schema({
        label: { type: String, required: true, trim: true, maxlength: 40 },
        place: { type: placeSchema, required: true }
    }) ]
}, { timestamps: true });

userSchema.plugin(accountPlugin);

module.exports = mongoose.model('user', userSchema);
