// End-to-end check of the whole booking flow against a running API with demo data.
//   npm run seed-demo && npm start        (in one terminal)
//   npm test                              (in another; API_URL defaults to http://localhost:4000)
// Each run registers its own customer and driver, so it can be repeated on the same database.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { DEMO_PASSWORD, ACCOUNTS } = require('../scripts/seed-demo');

const API_URL = process.env.API_URL || 'http://localhost:4000';
const RUN = Date.now().toString(36);
const PASSWORD = `Qa-${RUN}-pass`;

// A tiny API client that keeps its own login cookie, like one browser.
const client = () => {
    let cookie = '';

    const call = async (method, path, body, { raw } = {}) => {
        const response = await fetch(API_URL + path, {
            method,
            headers: { ...(body && !raw ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
            body: raw ? body : body ? JSON.stringify(body) : undefined
        });

        const setCookie = response.headers.get('set-cookie');
        if (setCookie) cookie = setCookie.split(';')[ 0 ];

        return { status: response.status, data: await response.json().catch(() => null) };
    };

    return {
        get: (path) => call('GET', path),
        post: (path, body, options) => call('POST', path, body, options),
        patch: (path, body) => call('PATCH', path, body),
        del: (path) => call('DELETE', path)
    };
}

const ok = (response, status = 200) => {
    assert.equal(response.status, status, `expected ${status}, got ${response.status}: ${JSON.stringify(response.data)}`);
    return response.data;
}

const customer = client();
const driver = client();
const admin = client();
const stranger = client();

// Far from the demo drivers, so searches here only find the driver this run creates.
const PICKUP = { address: 'Hazratganj, Lucknow', lat: 26.8467, lng: 80.9462 };
const DESTINATION = { address: 'Lucknow Airport', lat: 26.7606, lng: 80.8893 };

const inMinutes = (minutes) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

const details = (overrides = {}) => ({
    bookingType: 'hourly',
    pickup: PICKUP,
    startTime: inMinutes(30),
    duration: 3,
    vehicle: { type: 'suv', transmission: 'manual', model: 'Toyota Fortuner' },
    ...overrides
});

let driverId;

before(async () => {
    const health = await fetch(API_URL).catch(() => null);
    assert.ok(health?.ok, `The API is not running at ${API_URL}`);
});

test('accounts: register, validation, login, profile', async () => {
    ok(await customer.post('/auth/register/customer', { fullname: { firstname: 'Ayush' }, email: `c-${RUN}@qa.test`, phone: '9811111111', password: PASSWORD }), 201);
    const registered = ok(await driver.post('/auth/register/driver', { fullname: { firstname: 'Raj', lastname: 'Kumar' }, email: `d-${RUN}@qa.test`, phone: '9822222222', password: PASSWORD }), 201);
    driverId = registered.account._id;
    assert.equal(registered.account.verification.status, 'pending');
    assert.equal(registered.account.password, undefined);

    assert.equal((await stranger.post('/auth/register/customer', { fullname: { firstname: 'A' }, email: 'nope', phone: '1', password: 'short' })).status, 400);
    assert.equal((await stranger.post('/auth/register/customer', { fullname: { firstname: 'Copy' }, email: `c-${RUN}@qa.test`, phone: '9811111111', password: PASSWORD })).status, 409);
    assert.equal((await stranger.post('/auth/login', { role: 'customer', email: `c-${RUN}@qa.test`, password: 'wrong-password' })).status, 401);
    assert.equal((await stranger.get('/auth/me')).status, 401);

    ok(await admin.post('/auth/login', { role: 'admin', email: ACCOUNTS.admin.email, password: DEMO_PASSWORD }));

    const updated = ok(await customer.patch('/customers/me', { emergencyContact: { name: 'Neha', phone: '9833333333' } }));
    assert.equal(updated.account.emergencyContact.name, 'Neha');

    const saved = ok(await customer.post('/customers/me/locations', { label: 'Home', place: PICKUP }), 201);
    assert.equal(saved.savedLocations.length, 1);
    ok(await customer.del(`/customers/me/locations/${saved.savedLocations[ 0 ]._id}`));
});

test('roles are kept apart', async () => {
    assert.equal((await customer.get('/admin/stats')).status, 401);
    assert.equal((await driver.post('/drivers/search', details())).status, 401);
    assert.equal((await customer.get('/drivers/me')).status, 401);
});

test('driver onboarding and admin verification', async () => {
    assert.equal((await driver.patch('/drivers/me/availability', { isOnline: true })).status, 403);
    assert.equal((await driver.post('/drivers/me/submit-verification')).status, 400);

    const profile = ok(await driver.patch('/drivers/me', {
        experienceYears: 8,
        languages: [ 'Hindi', 'English' ],
        services: [ 'hourly', 'full_day', 'outstation', 'multi_day', 'airport', 'event' ],
        vehicleTypes: [ 'sedan', 'suv' ],
        transmissions: [ 'manual', 'automatic' ],
        rates: { hourly: 150, fullDay: 1200, outstationPerDay: 2000 },
        serviceRadiusKm: 20,
        address: 'Gomti Nagar, Lucknow',
        licence: { number: 'UP32-2016-123456', expiry: inMinutes(60 * 24 * 400) },
        emergencyContact: { name: 'Sita', phone: '9844444444' },
        baseLocation: { address: 'Gomti Nagar, Lucknow', lat: 26.8500, lng: 80.9500 }
    }));
    assert.deepEqual(profile.missingFields, []);

    ok(await driver.post('/drivers/me/submit-verification'));

    const waiting = ok(await admin.get('/admin/drivers?verificationStatus=under_review'));
    assert.ok(waiting.items.some(item => item._id === driverId));

    assert.equal((await admin.patch(`/admin/drivers/${driverId}/verification`, { status: 'rejected' })).status, 400);
    ok(await admin.patch(`/admin/drivers/${driverId}/verification`, { status: 'verified' }));

    // Not found by customers until the driver goes online.
    assert.equal(ok(await customer.post('/drivers/search', details())).drivers.length, 0);
    ok(await driver.patch('/drivers/me/availability', { isOnline: true }));
});

test('search: pricing, filters, car compatibility and working hours', async () => {
    const hourly = ok(await customer.post('/drivers/search', details()));
    assert.equal(hourly.drivers.length, 1);
    assert.equal(hourly.drivers[ 0 ].price.driverCharges, 450);
    assert.equal(hourly.drivers[ 0 ].price.platformCommission, 45);
    assert.equal(hourly.drivers[ 0 ].price.driverEarning, 405);
    assert.equal(hourly.drivers[ 0 ].phone, undefined);

    const fullDay = ok(await customer.post('/drivers/search', details({ bookingType: 'full_day', duration: 10 })));
    assert.equal(fullDay.drivers[ 0 ].price.driverCharges, 1200 + 2 * 150);

    const outstation = ok(await customer.post('/drivers/search', details({ bookingType: 'outstation', tripType: 'round_trip', destination: DESTINATION, duration: 3 })));
    assert.equal(outstation.drivers[ 0 ].price.driverCharges, 6000);

    assert.equal((await customer.post('/drivers/search', details({ bookingType: 'airport' }))).status, 400);
    assert.equal((await customer.post('/drivers/search', details({ duration: 40 }))).status, 400);
    assert.equal((await customer.post('/drivers/search', details({ startTime: inMinutes(-120) }))).status, 400);

    assert.equal(ok(await customer.post('/drivers/search', details({ vehicle: { type: 'luxury', transmission: 'manual' } }))).drivers.length, 0);
    assert.equal(ok(await customer.post('/drivers/search', details({ filters: { language: 'Tamil' } }))).drivers.length, 0);
    assert.equal(ok(await customer.post('/drivers/search', details({ filters: { language: 'hindi' } }))).drivers.length, 1);
    assert.equal(ok(await customer.post('/drivers/search', details({ filters: { maxPrice: 400 } }))).drivers.length, 0);
    assert.equal(ok(await customer.post('/drivers/search', details({ pickup: { address: 'Kanpur', lat: 26.4499, lng: 80.3319 } }))).drivers.length, 0);

    // Working hours that exclude every day but one hide the driver on the other days.
    const startDay = new Date(details().startTime);
    const localDay = new Date(startDay.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay();
    ok(await driver.patch('/drivers/me', { workingHours: { enabled: true, days: [ (localDay + 1) % 7 ], start: '00:00', end: '23:59' } }));
    assert.equal(ok(await customer.post('/drivers/search', details())).drivers.length, 0);
    assert.equal((await driver.patch('/drivers/me', { workingHours: { enabled: true, days: [ 1 ], start: '18:00', end: '09:00' } })).status, 400);
    ok(await driver.patch('/drivers/me', { workingHours: { enabled: false, days: [ 0, 1, 2, 3, 4, 5, 6 ], start: '06:00', end: '22:00' } }));
    assert.equal(ok(await customer.post('/drivers/search', details())).drivers.length, 1);

    const publicProfile = ok(await customer.get(`/drivers/${driverId}`));
    assert.equal(publicProfile.verified, true);
    assert.equal(publicProfile.licence, undefined);
    assert.equal(publicProfile.email, undefined);
});

test('reject, cancel and double-booking protection', async () => {
    const first = ok(await customer.post('/bookings', { ...details(), driverId }), 201);
    assert.equal(first.status, 'requested');
    assert.equal(first.startOtp, undefined);
    assert.equal(first.driver.phone, undefined);

    ok(await driver.post(`/bookings/${first._id}/reject`, { reason: 'Busy' }));
    assert.equal(ok(await customer.get(`/bookings/${first._id}`)).status, 'driver_rejected');

    // Two overlapping requests: only one can be accepted.
    const a = ok(await customer.post('/bookings', { ...details(), driverId }), 201);
    const b = ok(await customer.post('/bookings', { ...details({ startTime: inMinutes(90) }), driverId }), 201);
    ok(await driver.post(`/bookings/${a._id}/accept`));
    assert.equal((await driver.post(`/bookings/${b._id}/accept`)).status, 409);
    assert.equal(ok(await customer.get(`/bookings/${b._id}`)).status, 'driver_rejected');

    // The driver is hidden for that time, and free again after the customer cancels.
    assert.equal(ok(await customer.post('/drivers/search', details())).drivers.length, 0);
    assert.equal((await stranger.post(`/bookings/${a._id}/cancel`, {})).status, 401);
    ok(await customer.post(`/bookings/${a._id}/cancel`, { reason: 'Plans changed' }));
    assert.equal(ok(await customer.post('/drivers/search', details())).drivers.length, 1);

    // Support can cancel a booking that has not started.
    const c = ok(await customer.post('/bookings', { ...details(), driverId }), 201);
    ok(await driver.post(`/bookings/${c._id}/accept`));
    assert.equal((await admin.post(`/admin/bookings/${c._id}/cancel`, {})).status, 400);
    const cancelled = ok(await admin.post(`/admin/bookings/${c._id}/cancel`, { reason: 'Customer asked support to cancel' }));
    assert.equal(cancelled.cancellation.by, 'admin');
    assert.equal(ok(await customer.post('/drivers/search', details())).drivers.length, 1);
});

test('full trip: accept, track, share, SOS, OTPs, payment, ratings', async () => {
    const booking = ok(await customer.post('/bookings', { ...details({ bookingType: 'airport', destination: DESTINATION, notes: 'Two bags' }), driverId }), 201);
    const id = booking._id;

    assert.equal((await customer.post(`/bookings/${id}/share`)).status, 409);
    assert.equal((await customer.post(`/bookings/${id}/sos`, {})).status, 409);
    assert.equal(ok(await driver.get('/bookings?scope=requests')).length, 1);

    ok(await driver.post(`/bookings/${id}/accept`));
    let view = ok(await customer.get(`/bookings/${id}`));
    assert.match(view.startOtp, /^\d{4}$/);
    assert.equal(view.endOtp, undefined);
    assert.equal(view.driver.phone, '9822222222');
    assert.equal(view.driverLocation, undefined);
    assert.equal(ok(await driver.get(`/bookings/${id}`)).startOtp, undefined);

    // Sharing: a public link with no private details.
    const share = ok(await customer.post(`/bookings/${id}/share`));
    assert.match(share.url, /\/track\/[0-9a-f]{40}$/);
    assert.equal(ok(await customer.post(`/bookings/${id}/share`)).token, share.token);
    let shared = ok(await stranger.get(`/bookings/shared/${share.token}`));
    assert.equal(shared.active, true);
    assert.equal(shared.driver.fullname.firstname, 'Raj');
    assert.equal(JSON.stringify(shared).includes('9822222222'), false);
    assert.equal(shared.startOtp, undefined);
    assert.equal(shared.driverLocation, undefined);
    assert.equal((await stranger.get(`/bookings/shared/${'0'.repeat(40)}`)).status, 404);

    // Live location is passed on once the driver sets off.
    ok(await driver.post(`/bookings/${id}/on-the-way`));
    ok(await driver.patch('/drivers/me/location', { lat: 26.8490, lng: 80.9480 }));
    view = ok(await customer.get(`/bookings/${id}`));
    assert.equal(view.driverLocation.lat, 26.8490);
    assert.equal(view.driver.location, undefined);
    assert.equal(ok(await stranger.get(`/bookings/shared/${share.token}`)).driverLocation.lng, 80.9480);

    ok(await driver.post(`/bookings/${id}/arrived`));

    // SOS reaches the admin panel.
    ok(await customer.post(`/bookings/${id}/sos`, { lat: 26.8467, lng: 80.9462 }), 201);
    const alerts = ok(await admin.get('/admin/sos?status=open'));
    const alert = alerts.items.find(item => item.booking._id === id);
    assert.ok(alert);
    assert.equal((await admin.patch(`/admin/sos/${alert._id}/resolve`, {})).status, 400);
    ok(await admin.patch(`/admin/sos/${alert._id}/resolve`, { resolutionNote: 'Called the customer, all fine' }));

    // OTPs
    assert.equal((await driver.post(`/bookings/${id}/start`, { otp: view.startOtp === '0000' ? '1111' : '0000' })).status, 400);
    ok(await driver.post(`/bookings/${id}/start`, { otp: view.startOtp }));
    view = ok(await customer.get(`/bookings/${id}`));
    assert.equal(view.status, 'trip_started');
    assert.equal(view.startOtp, undefined);
    assert.match(view.endOtp, /^\d{4}$/);
    assert.equal((await customer.post(`/bookings/${id}/cancel`, {})).status, 409);

    const completed = ok(await driver.post(`/bookings/${id}/complete`, { otp: view.endOtp }));
    assert.equal(completed.status, 'trip_completed');
    assert.equal(completed.pricing.driverCharges, 450);
    assert.equal(ok(await stranger.get(`/bookings/shared/${share.token}`)).active, false);

    assert.equal((await customer.post(`/bookings/${id}/review`, { rating: 5 })).status, 409);
    ok(await driver.post(`/bookings/${id}/payment-received`));
    assert.equal((await driver.post(`/bookings/${id}/payment-received`)).status, 409);

    ok(await customer.post(`/bookings/${id}/review`, { rating: 5, comment: 'Very safe driver' }));
    assert.equal((await customer.post(`/bookings/${id}/review`, { rating: 1 })).status, 409);
    ok(await driver.post(`/bookings/${id}/review-customer`, { rating: 4 }));

    view = ok(await customer.get(`/bookings/${id}`));
    assert.equal(view.status, 'rating_completed');
    assert.equal(view.driver.phone, undefined);
    assert.deepEqual(view.statusHistory.map(step => step.status), [
        'requested', 'driver_accepted', 'driver_on_the_way', 'driver_arrived', 'trip_started', 'trip_completed', 'payment_completed', 'rating_completed'
    ]);

    // Money and reputation
    const earnings = ok(await driver.get('/drivers/me/earnings'));
    assert.equal(earnings.today.gross, 450);
    assert.equal(earnings.today.commission, 45);
    assert.equal(earnings.today.net, 405);
    assert.equal(earnings.allTime.trips, 1);
    assert.equal(earnings.daily.length, 14);
    assert.equal(earnings.daily.at(-1).net, 405);
    assert.equal(earnings.trips.length, 1);

    const dashboard = ok(await driver.get('/drivers/me/dashboard'));
    assert.equal(dashboard.todayEarnings, 405);
    assert.equal(dashboard.rating.average, 5);

    const reviews = ok(await driver.get('/drivers/me/reviews'));
    assert.equal(reviews[ 0 ].comment, 'Very safe driver');
    assert.equal(ok(await customer.get(`/drivers/${driverId}`)).completedTrips, 1);
    assert.equal(ok(await customer.get('/auth/me')).account.rating.average, 4);

    // The driver is free again after the trip.
    assert.equal(ok(await customer.post('/drivers/search', details())).drivers.length, 1);
});

test('notifications and complaints', async () => {
    const inbox = ok(await customer.get('/support/notifications'));
    assert.ok(inbox.unread > 0);
    assert.ok(inbox.items.some(item => /accepted your booking/.test(item.message)));
    ok(await customer.post('/support/notifications/read'));
    assert.equal(ok(await customer.get('/support/notifications')).unread, 0);
    assert.ok(ok(await driver.get('/support/notifications')).items.some(item => /New booking request/.test(item.message)));

    const past = ok(await customer.get('/bookings?scope=past'));
    assert.equal((await customer.post('/support/complaints', { category: 'payment', description: 'short' })).status, 400);
    assert.equal((await driver.post('/support/complaints', { bookingId: '000000000000000000000000', category: 'payment', description: 'Not my booking at all' })).status, 404);
    const complaint = ok(await customer.post('/support/complaints', { bookingId: past[ 0 ]._id, category: 'payment', description: 'The driver asked for extra cash.' }), 201);
    assert.equal(ok(await customer.get('/support/complaints')).length, 1);

    const open = ok(await admin.get('/admin/complaints?status=open'));
    assert.ok(open.items.some(item => item._id === complaint._id));
    assert.equal((await admin.patch(`/admin/complaints/${complaint._id}`, { status: 'resolved' })).status, 400);
    ok(await admin.patch(`/admin/complaints/${complaint._id}`, { status: 'resolved', resolutionNote: 'Refunded the extra amount' }));
    assert.equal(ok(await customer.get('/support/complaints'))[ 0 ].status, 'resolved');
    assert.ok(ok(await customer.get('/support/notifications')).items.some(item => /complaint was resolved/.test(item.message)));
});

test('admin overview and account control', async () => {
    const stats = ok(await admin.get('/admin/stats'));
    assert.ok(stats.totalCustomers >= 1 && stats.totalDrivers >= 1 && stats.completedTrips >= 1);
    assert.equal(stats.last7Days.length, 7);
    assert.ok(stats.last7Days.at(-1).revenue >= 45);

    const driverDetail = ok(await admin.get(`/admin/drivers/${driverId}`));
    assert.equal(driverDetail.earnings.net, 405);

    const customers = ok(await admin.get(`/admin/customers?search=c-${RUN}`));
    assert.equal(customers.items.length, 1);
    const customerId = customers.items[ 0 ]._id;
    const detail = ok(await admin.get(`/admin/customers/${customerId}`));
    assert.equal(detail.totalSpent, 450);

    const bookings = ok(await admin.get('/admin/bookings?status=rating_completed'));
    assert.ok(bookings.items.length >= 1);
    assert.equal(ok(await admin.get(`/admin/bookings/${bookings.items[ 0 ]._id}`))._id, bookings.items[ 0 ]._id);

    // A suspended customer is locked out, then let back in.
    ok(await admin.patch(`/admin/customers/${customerId}/account-status`, { accountStatus: 'suspended' }));
    assert.equal((await customer.get('/bookings')).status, 403);
    ok(await admin.patch(`/admin/customers/${customerId}/account-status`, { accountStatus: 'active' }));
    ok(await customer.get('/bookings'));

    // A suspended driver disappears from search.
    ok(await admin.patch(`/admin/drivers/${driverId}/account-status`, { accountStatus: 'suspended' }));
    assert.equal(ok(await customer.post('/drivers/search', details())).drivers.length, 0);
    ok(await admin.patch(`/admin/drivers/${driverId}/account-status`, { accountStatus: 'active' }));
});

test('photo upload accepts images only', async () => {
    const form = (bytes, name) => {
        const data = new FormData();
        data.append('photo', new Blob([ bytes ]), name);
        return data;
    };

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

    assert.equal((await driver.post('/drivers/me/photo', form(Buffer.from('<script>alert(1)</script>'), 'photo.png'), { raw: true })).status, 400);
    const uploaded = ok(await driver.post('/drivers/me/photo', form(png, 'photo.png'), { raw: true }));
    assert.match(uploaded.account.profilePhotoUrl, /\/uploads\/[0-9a-f]{32}\.png$/);

    const image = await fetch(uploaded.account.profilePhotoUrl);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/png');
});

test('maps: suggestions, reverse geocoding and routes', async () => {
    const suggestions = ok(await customer.get('/maps/suggestions?input=Meerut'));
    assert.ok(suggestions.length > 0 && suggestions[ 0 ].label);

    const route = ok(await customer.get('/maps/route?fromLat=28.9845&fromLng=77.7064&toLat=28.6139&toLng=77.2090'));
    assert.ok(route.distanceKm > 50 && route.distanceKm < 120);
    assert.ok(route.path.length > 10);

    assert.equal((await customer.get('/maps/route?fromLat=999&fromLng=0&toLat=0&toLng=0')).status, 400);
    assert.equal((await stranger.get('/maps/suggestions?input=Meerut')).status, 401);
});

test('logout ends the session', async () => {
    ok(await customer.post('/auth/logout'));
    assert.equal((await customer.get('/auth/me')).status, 401);
    ok(await driver.patch('/drivers/me/availability', { isOnline: false }));
});
