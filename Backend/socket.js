const socketIo = require('socket.io');
const cookie = require('cookie');
const { clientUrl } = require('./config/env');
const { authenticateToken } = require('./middlewares/auth.middleware');

let io;

const isInRange = (value, limit) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

const accountRoom = (role, id) => `${role}:${id}`;
const ADMIN_ROOM = 'admins';

function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: clientUrl,
            credentials: true
        }
    });

    // Authenticate during the handshake: browsers send the login cookie, other clients pass auth.token.
    io.use(async (socket, next) => {
        try {
            const cookies = cookie.parse(socket.handshake.headers.cookie || '');
            const auth = await authenticateToken(cookies.token || socket.handshake.auth?.token);

            if (!auth || auth.account.accountStatus === 'suspended') {
                return next(new Error('Unauthorized'));
            }

            socket.data.role = auth.role;
            socket.data.accountId = auth.account._id.toString();
            return next();
        } catch (err) {
            return next(err);
        }
    });

    io.on('connection', (socket) => {
        const { role, accountId } = socket.data;

        // Every connection of an account joins its room, so events reach all of its tabs.
        socket.join(accountRoom(role, accountId));
        if (role === 'admin') socket.join(ADMIN_ROOM);

        socket.on('driver:location', async (data) => {
            try {
                if (role !== 'driver') {
                    return socket.emit('app:error', { message: 'Only drivers can share their location' });
                }

                if (!isInRange(data?.lat, 90) || !isInRange(data?.lng, 180)) {
                    return socket.emit('app:error', { message: 'Invalid location data' });
                }

                // Required here because the tracking service itself needs this module.
                await require('./services/tracking.service').recordDriverLocation(accountId, data.lat, data.lng);
            } catch (err) {
                console.error('Driver location update failed', err);
                socket.emit('app:error', { message: 'Unable to update location' });
            }
        });
    });
}

// Sends an event to every connected socket of one account.
const emitToAccount = (role, id, event, data) => {
    if (io && id) {
        io.to(accountRoom(role, id.toString())).emit(event, data);
    }
}

// Sends an event to every connected admin.
const emitToAdmins = (event, data) => {
    if (io) {
        io.to(ADMIN_ROOM).emit(event, data);
    }
}

module.exports = { initializeSocket, emitToAccount, emitToAdmins };
