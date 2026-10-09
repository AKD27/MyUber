const { z, phone, fullname, placeInput } = require('./common');
const { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS } = require('../config/constants');

const rate = z.number().int().min(50, 'Rates must be at least ₹50').max(100000);

module.exports.updateDriverProfileSchema = z.object({
    fullname: fullname.optional(),
    phone: phone.optional(),
    profilePhotoUrl: z.string().trim().url('Enter a valid image URL').max(500).or(z.literal('')).optional(),
    about: z.string().trim().max(1000).optional(),
    experienceYears: z.number().int().min(0).max(60).optional(),
    languages: z.array(z.string().trim().min(2).max(30)).max(10).optional(),
    services: z.array(z.enum(Object.keys(BOOKING_TYPES))).optional(),
    vehicleTypes: z.array(z.enum(CAR_TYPES)).optional(),
    transmissions: z.array(z.enum(TRANSMISSIONS)).optional(),
    rates: z.object({
        hourly: rate.optional(),
        fullDay: rate.optional(),
        outstationPerDay: rate.optional()
    }).optional(),
    serviceRadiusKm: z.number().int().min(1).max(100).optional(),
    address: z.string().trim().min(5).max(300).optional(),
    licence: z.object({
        number: z.string().trim().min(5, 'Enter a valid licence number').max(30),
        expiry: z.coerce.date()
    }).optional(),
    emergencyContact: z.object({
        name: z.string().trim().min(2).max(60),
        phone
    }).optional(),
    // Where the driver usually starts from; updated live by the app while online.
    baseLocation: placeInput.optional()
}).refine(data => Object.keys(data).length > 0, 'Nothing to update');

module.exports.availabilitySchema = z.object({ isOnline: z.boolean() });

module.exports.locationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
});
