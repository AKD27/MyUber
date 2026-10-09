const { z } = require('zod');
const mongoose = require('mongoose');

const objectId = z.string().refine(value => mongoose.isValidObjectId(value), 'Invalid id');

const phone = z.string().trim().regex(/^\+?[0-9 ]{10,15}$/, 'Enter a valid phone number');

const password = z.string().min(8, 'Password must be at least 8 characters').max(100);

const fullname = z.object({
    firstname: z.string().trim().min(2, 'First name must be at least 2 characters').max(50),
    lastname: z.string().trim().max(50).optional()
});

// A place picked from address suggestions; coordinates are filled in by geocoding when missing.
const placeInput = z.object({
    address: z.string().trim().min(3, 'Enter an address').max(300),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional()
});

const idParams = z.object({ id: objectId });

module.exports = { z, objectId, phone, password, fullname, placeInput, idParams };
