# Driver on Demand API

Express + MongoDB API for the Driver on Demand platform. Setup is in the [project README](../README.md); all settings are listed in [`.env.example`](.env.example).

## Conventions

- **Auth:** log in or register to receive a `token` cookie (HTTP-only, 24 hours). Browsers send it automatically with `withCredentials`; other clients may send `Authorization: Bearer <token>` instead.
- **Roles:** `customer`, `driver`, `admin`. Each route below lists who may call it; others get `401`. Suspended accounts get `403`.
- **Errors:** JSON `{ "message": "..." }`. Validation errors (`400`) also include `errors: [{ field, message }]`.
- **Places** are sent as `{ "address": "...", "lat": 28.98, "lng": 77.70 }`. `lat`/`lng` come from `/maps/suggestions`; when missing, the server geocodes the address.
- **Times** are ISO 8601 strings with a time zone, e.g. `2026-10-10T10:00:00+05:30`.

## Auth — `/auth`

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/register/customer` | `{ fullname: { firstname, lastname? }, email, phone, password }` | Password ≥ 8 characters. Returns `{ role, account }` and sets the cookie. |
| POST | `/register/driver` | same | Driver starts with verification `pending`. |
| POST | `/login` | `{ role, email, password }` | `role` is `customer`, `driver` or `admin`. |
| POST | `/logout` | — | Any role. Revokes the token. |
| GET | `/me` | — | Any role. `{ role, account }`. |
| POST | `/forgot-password` | `{ role, email }` | Always `200`; emails (or logs) a link valid for 30 minutes. |
| POST | `/reset-password` | `{ role, token, password }` | Token from the link; single use. |

Login, register and password routes are rate limited per IP (`AUTH_RATE_LIMIT_MAX` per 15 minutes).

## Customers — `/customers` (customer)

| Method | Path | Body |
|---|---|---|
| PATCH | `/me` | `{ fullname?, phone? }` |
| POST | `/me/locations` | `{ label, place }` (up to 10 saved places) |
| DELETE | `/me/locations/:id` | — |

## Maps — `/maps` (any role)

| Method | Path | Returns |
|---|---|---|
| GET | `/suggestions?input=meer` | `[{ label, lat, lng }]` (Google provider: `[{ label }]`) |
| GET | `/reverse?lat=..&lng=..` | `{ address, lat, lng }` |

## Drivers — `/drivers`

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/me` | driver | `{ account, missingFields }`; `missingFields` lists what blocks verification. |
| PATCH | `/me` | driver | Any of: `fullname, phone, profilePhotoUrl, about, experienceYears, languages[], services[], vehicleTypes[], transmissions[], rates { hourly, fullDay, outstationPerDay }, serviceRadiusKm, address, licence { number, expiry }, emergencyContact { name, phone }, baseLocation (place)`. Changing the licence of a verified driver sends them back to review. |
| POST | `/me/submit-verification` | driver | `pending`/`rejected` → `under_review` when nothing is missing. |
| PATCH | `/me/availability` | driver | `{ isOnline }`; only verified drivers with a location. |
| PATCH | `/me/location` | driver | `{ lat, lng }` (the app also sends `driver:location` over the socket). |
| GET | `/me/dashboard` | driver | Today's earnings and trips, pending/upcoming/active counts, totals, rating. |
| POST | `/search` | customer | Booking details (below) plus `filters { language?, minRating?, minExperience?, maxPrice? }` and `sort` (`recommended`, `distance`, `price`, `rating`, `experience`). Returns `{ startTime, endTime, duration, routeEstimate, drivers: [{ ...publicProfile, distanceKm, price }] }`. |
| GET | `/:id` | customer | Public profile of a verified driver with the latest 20 reviews. |

Values: `services` = `hourly, full_day, outstation, multi_day, airport, event`; `vehicleTypes` = `hatchback, sedan, suv, muv, luxury`; `transmissions` = `manual, automatic`.

Search only returns drivers who are verified, active and online; within both `SEARCH_RADIUS_KM` and their own `serviceRadiusKm` of the pickup; offer the booking type; can drive the car type and transmission; have the needed rates; and have no booked hours in the booking window.

## Bookings — `/bookings`

**Booking details** (used by `/drivers/search` and `POST /bookings`):

```json
{
  "bookingType": "outstation",
  "tripType": "round_trip",
  "pickup": { "address": "Meerut City Railway Station", "lat": 28.9845, "lng": 77.7064 },
  "destination": { "address": "Hawa Mahal, Jaipur", "lat": 26.9239, "lng": 75.8267 },
  "startTime": "2026-10-10T06:00:00+05:30",
  "duration": 3,
  "vehicle": { "type": "suv", "transmission": "manual", "model": "Toyota Fortuner" },
  "notes": "Two elderly passengers"
}
```

`duration` is in hours or days depending on the type (see the project README). `destination` is required for `outstation` and `airport`, and `tripType` for `outstation`. Bookings can start up to 60 days ahead.

| Method | Path | Who | Transition / notes |
|---|---|---|---|
| GET | `/?scope=` | customer, driver | `scope`: `all`, `requests`, `upcoming`, `active`, `past`. |
| GET | `/:id` | customer, driver | Own bookings only. |
| POST | `/` | customer | Details + `driverId` → `requested`. Price is computed on the server. `409` if the driver is no longer available. |
| POST | `/:id/cancel` | customer | `{ reason? }`; from requested/accepted/on the way/arrived → `cancelled`. |
| POST | `/:id/review` | customer | `{ rating 1–5, comment? }`; `payment_completed` → `rating_completed`. |
| POST | `/:id/accept` | driver | `requested` → `driver_accepted`; reserves the hours. `409` if they overlap another accepted booking (the request is then auto-rejected). |
| POST | `/:id/reject` | driver | `{ reason? }` → `driver_rejected`. |
| POST | `/:id/on-the-way` | driver | → `driver_on_the_way`. |
| POST | `/:id/arrived` | driver | → `driver_arrived`. |
| POST | `/:id/start` | driver | `{ otp }` (customer's start OTP) → `trip_started`. |
| POST | `/:id/complete` | driver | `{ otp }` (customer's end OTP) → `trip_completed`; adds overtime; frees unused hours. |
| POST | `/:id/payment-received` | driver | → `payment_completed`; updates the driver's earnings. |
| POST | `/:id/driver-cancel` | driver | `{ reason? }`; from accepted/on the way/arrived → `cancelled`; counts toward the cancellation rate. |
| POST | `/:id/review-customer` | driver | `{ rating 1–5, comment? }` after the trip. |

Requests the driver does not answer within `BOOKING_REQUEST_TIMEOUT_MS` become `expired`. Accepted bookings whose whole time window passes without the trip starting are cancelled automatically.

What each side sees: the customer gets the start OTP while the driver is on the way and the end OTP during the trip; the driver never gets OTPs. Phone numbers are shared only from acceptance until the trip is completed.

## Admin — `/admin` (admin)

| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | Customers, drivers, online drivers, pending verifications, today's bookings, booking value and commission. |
| GET | `/drivers?verificationStatus=&accountStatus=&search=&page=` | 20 per page. |
| GET | `/drivers/:id` | Full profile, `missingFields`, recent bookings. |
| PATCH | `/drivers/:id/verification` | `{ status: under_review \| verified \| rejected, note? }`; a note is required to reject. |
| PATCH | `/drivers/:id/account-status` | `{ accountStatus: active \| suspended }`. |
| GET | `/customers?accountStatus=&search=&page=` | |
| PATCH | `/customers/:id/account-status` | `{ accountStatus }`. |
| GET | `/bookings?status=&page=` | With customer and driver contact details. |

Create the first admin with `npm run create-admin -- <email> <password> [first name]`. Running it again for the same email resets that admin's password.

## Socket events

Connect with Socket.IO (`withCredentials: true`); the server authenticates from the login cookie (or `auth: { token }`).

| Direction | Event | Payload |
|---|---|---|
| server → driver | `booking:request` | `{ message, booking }` for a new request |
| server → both | `booking:updated` | `{ message, booking }` after every status change |
| server → driver | `account:updated` | `{ message, verification }` after an admin decision |
| driver → server | `driver:location` | `{ lat, lng }` |
| server → client | `app:error` | `{ message }` |
