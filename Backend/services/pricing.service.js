const { FULL_DAY_HOURS } = require('../config/constants');
const { commissionPercent } = require('../config/env');

// Which of the driver's rates each booking type needs.
const REQUIRED_RATES = {
    hourly: [ 'hourly' ],
    airport: [ 'hourly' ],
    full_day: [ 'fullDay', 'hourly' ],
    event: [ 'fullDay', 'hourly' ],
    outstation: [ 'outstationPerDay' ],
    multi_day: [ 'outstationPerDay' ]
};

const hasRatesFor = (driver, bookingType) =>
    REQUIRED_RATES[ bookingType ].every(rate => driver.rates?.[ rate ] > 0);

const withCommission = (pricing) => {
    const driverCharges = pricing.baseCharges + (pricing.extraCharges || 0);
    const platformCommission = Math.round(driverCharges * commissionPercent / 100);

    return {
        ...pricing,
        extraCharges: pricing.extraCharges || 0,
        driverCharges,
        commissionPercent,
        platformCommission,
        driverEarning: driverCharges - platformCommission
    };
}

// The price of one booking with one driver. The customer pays driverCharges (cash, to the driver);
// the platform's commission comes out of it.
const quote = (driver, bookingType, durationValue) => {
    if (!hasRatesFor(driver, bookingType)) {
        return null;
    }

    const { hourly, fullDay, outstationPerDay } = driver.rates;

    switch (bookingType) {
        case 'hourly':
        case 'airport':
            return withCommission({ rate: hourly, rateUnit: 'hour', baseCharges: hourly * durationValue });
        case 'full_day':
        case 'event':
            return withCommission({
                rate: fullDay,
                rateUnit: 'full_day',
                baseCharges: fullDay + Math.max(0, durationValue - FULL_DAY_HOURS) * hourly
            });
        default:
            return withCommission({ rate: outstationPerDay, rateUnit: 'day', baseCharges: outstationPerDay * durationValue });
    }
}

// Overtime on time-based bookings: each started hour past the booked end (after a 15 minute grace) at the hourly rate.
const OVERTIME_GRACE_MS = 15 * 60 * 1000;

const overtimeCharges = (booking, driver, completedAt) => {
    if (booking.duration.unit !== 'hours' || !driver.rates?.hourly) {
        return 0;
    }

    const overtimeMs = completedAt - booking.endTime;
    return overtimeMs > OVERTIME_GRACE_MS ? Math.ceil(overtimeMs / (60 * 60 * 1000)) * driver.rates.hourly : 0;
}

module.exports = { REQUIRED_RATES, hasRatesFor, quote, withCommission, overtimeCharges };
