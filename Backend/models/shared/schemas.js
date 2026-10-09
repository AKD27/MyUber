const mongoose = require('mongoose');

// GeoJSON point; coordinates are [ longitude, latitude ].
const pointSchema = new mongoose.Schema({
    type: { type: String, enum: [ 'Point' ], default: 'Point' },
    coordinates: { type: [ Number ], required: true }
}, { _id: false });

const placeSchema = new mongoose.Schema({
    address: { type: String, required: true, trim: true },
    location: { type: pointSchema, required: true }
}, { _id: false });

module.exports = { pointSchema, placeSchema };
