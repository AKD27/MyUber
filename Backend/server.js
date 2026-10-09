const http = require('http');
const { port, bookingRequestTimeoutMs } = require('./config/env');
const app = require('./app');
const connectToDb = require('./db/db');
const { initializeSocket } = require('./socket');
const { expireStaleRequests } = require('./services/booking.service');

// Often enough that a request expires close to its deadline.
const EXPIRY_SWEEP_MS = Math.min(15 * 1000, Math.max(1000, bookingRequestTimeoutMs / 3));

const server = http.createServer(app);

initializeSocket(server);

connectToDb()
    .then(() => {
        server.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

        // Expire booking requests drivers did not answer in time.
        setInterval(() => {
            expireStaleRequests().catch(err => console.error('Expiring booking requests failed', err));
        }, EXPIRY_SWEEP_MS).unref();
    })
    .catch(err => {
        console.error('Could not connect to MongoDB. Check DB_CONNECT and, for Atlas, Network Access.', err.message);
        process.exit(1);
    });
