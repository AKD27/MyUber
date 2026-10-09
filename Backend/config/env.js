const dotenv = require('dotenv');
dotenv.config();

const required = [ 'DB_CONNECT', 'JWT_SECRET' ];
const missing = required.filter(name => !process.env[ name ]);

if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
    process.exit(1);
}

const number = (name, fallback) => {
    const value = Number(process.env[ name ]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

module.exports = {
    isProduction: process.env.NODE_ENV === 'production',
    port: number('PORT', 4000),
    dbConnect: process.env.DB_CONNECT,
    jwtSecret: process.env.JWT_SECRET,
    // The frontend origin, allowed by CORS with credentials (cookies).
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

    commissionPercent: number('COMMISSION_PERCENT', 10),
    // How long a driver has to accept or reject a booking request.
    bookingRequestTimeoutMs: number('BOOKING_REQUEST_TIMEOUT_MS', 5 * 60 * 1000),
    // Default and maximum distance between a driver and the pickup when searching.
    searchRadiusKm: number('SEARCH_RADIUS_KM', 15),
    maxOtpAttempts: number('MAX_OTP_ATTEMPTS', 5),

    authRateLimitMax: number('AUTH_RATE_LIMIT_MAX', 20),

    smtp: {
        host: process.env.SMTP_HOST,
        port: number('SMTP_PORT', 587),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.MAIL_FROM || 'Driver on Demand <no-reply@driverondemand.local>'
    }
};
