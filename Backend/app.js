const { clientUrl, isProduction } = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

if (isProduction) {
    app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.json({ name: 'Driver on Demand API', status: 'ok' });
});

app.use('/auth', require('./routes/auth.routes'));
app.use('/customers', require('./routes/customer.routes'));
app.use('/maps', require('./routes/maps.routes'));
app.use('/drivers', require('./routes/driver.routes'));
app.use('/bookings', require('./routes/booking.routes'));
app.use('/admin', require('./routes/admin.routes'));

app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
});

app.use(errorMiddleware);

module.exports = app;
