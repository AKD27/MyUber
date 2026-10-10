// Fills an empty database with demo accounts for testing: one admin, one customer and a few
// verified drivers around Meerut who are online. Safe to run again; existing demo accounts are reset.
// Usage: npm run seed-demo            (never run this against a production database)
const mongoose = require('mongoose');
const { dbConnect, isProduction } = require('../config/env');
const userModel = require('../models/user.model');
const driverModel = require('../models/driver.model');

// Demo logins. Change or delete these accounts before going live.
const DEMO_PASSWORD = 'Demo@12345';

const ACCOUNTS = {
    admin: { email: 'admin@demo.driverondemand.test', firstname: 'Asha', lastname: 'Admin', phone: '9000000001' },
    customer: { email: 'customer@demo.driverondemand.test', firstname: 'Ayush', lastname: 'Verma', phone: '9000000002' }
};

const ALL_SERVICES = [ 'hourly', 'full_day', 'outstation', 'multi_day', 'airport', 'event' ];

const DRIVERS = [
    {
        email: 'raj@demo.driverondemand.test', firstname: 'Raj', lastname: 'Kumar', phone: '9000000011',
        experienceYears: 8, languages: [ 'Hindi', 'English' ], rates: { hourly: 150, fullDay: 1200, outstationPerDay: 2000 },
        coordinates: [ 77.7064, 28.9845 ], rating: { average: 4.8, count: 212 }, completedTrips: 1245,
        about: 'Eight years driving families on the Delhi–Jaipur and Delhi–Dehradun routes. Calm, punctual and careful with your car.'
    },
    {
        email: 'amit@demo.driverondemand.test', firstname: 'Amit', lastname: 'Sharma', phone: '9000000012',
        experienceYears: 6, languages: [ 'Hindi', 'Punjabi' ], rates: { hourly: 140, fullDay: 1100, outstationPerDay: 1800 },
        coordinates: [ 77.7260, 28.9931 ], rating: { average: 4.7, count: 148 }, completedTrips: 870,
        about: 'Automatic and manual, sedans to SUVs. Comfortable with night drives and airport runs.'
    },
    {
        email: 'imran@demo.driverondemand.test', firstname: 'Imran', lastname: 'Khan', phone: '9000000013',
        experienceYears: 12, languages: [ 'Hindi', 'English', 'Urdu' ], rates: { hourly: 180, fullDay: 1400, outstationPerDay: 2200 },
        coordinates: [ 77.6920, 28.9690 ], rating: { average: 4.9, count: 331 }, completedTrips: 2104,
        about: 'Twelve years with luxury cars and wedding convoys. Hill routes to Mussoorie, Nainital and Manali.'
    },
    {
        email: 'suresh@demo.driverondemand.test', firstname: 'Suresh', lastname: 'Yadav', phone: '9000000014',
        experienceYears: 4, languages: [ 'Hindi' ], rates: { hourly: 120, fullDay: 950, outstationPerDay: 1600 },
        coordinates: [ 77.7410, 28.9720 ], rating: { average: 4.5, count: 64 }, completedTrips: 310,
        about: 'City driving specialist: office commutes, shopping trips and hospital visits.'
    }
];

const upsert = async (model, email, fields) => {
    const account = await model.findOne({ email }) || new model({ email });
    account.set({ ...fields, password: await model.hashPassword(DEMO_PASSWORD), accountStatus: 'active' });
    await account.save();
    return account;
}

const fullname = ({ firstname, lastname }) => ({ firstname, lastname });

const seed = async () => {
    if (isProduction) {
        throw new Error('Refusing to create demo accounts with NODE_ENV=production');
    }

    await mongoose.connect(dbConnect);

    await upsert(userModel, ACCOUNTS.admin.email, { role: 'admin', fullname: fullname(ACCOUNTS.admin), phone: ACCOUNTS.admin.phone });
    await upsert(userModel, ACCOUNTS.customer.email, {
        role: 'customer', fullname: fullname(ACCOUNTS.customer), phone: ACCOUNTS.customer.phone,
        emergencyContact: { name: 'Neha Verma', phone: '9000000003' }
    });

    for (const driver of DRIVERS) {
        await upsert(driverModel, driver.email, {
            fullname: fullname(driver),
            phone: driver.phone,
            about: driver.about,
            experienceYears: driver.experienceYears,
            languages: driver.languages,
            services: ALL_SERVICES,
            vehicleTypes: [ 'hatchback', 'sedan', 'suv', 'muv', 'luxury' ],
            transmissions: [ 'manual', 'automatic' ],
            rates: driver.rates,
            serviceRadiusKm: 25,
            address: 'Shastri Nagar, Meerut, Uttar Pradesh',
            licence: { number: `UP15-2015-${driver.phone.slice(-6)}`, expiry: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000) },
            emergencyContact: { name: 'Family contact', phone: '9000000099' },
            verification: { status: 'verified', submittedAt: new Date(), reviewedAt: new Date() },
            isOnline: true,
            location: { type: 'Point', coordinates: driver.coordinates },
            locationUpdatedAt: new Date(),
            rating: driver.rating,
            'stats.completedTrips': driver.completedTrips,
            'stats.acceptedBookings': Math.round(driver.completedTrips * 1.03)
        });
    }

    await driverModel.syncIndexes();
    await mongoose.disconnect();

    console.log(`Demo accounts are ready (password for all: ${DEMO_PASSWORD})`);
    console.log(`  Admin:    ${ACCOUNTS.admin.email}`);
    console.log(`  Customer: ${ACCOUNTS.customer.email}`);
    for (const driver of DRIVERS) console.log(`  Driver:   ${driver.email}`);
}

// Only seed when run directly; the tests just read the demo logins below.
if (require.main === module) {
    seed().catch(err => {
        console.error(err.message);
        process.exit(1);
    });
}

module.exports = { DEMO_PASSWORD, ACCOUNTS, DRIVERS };
