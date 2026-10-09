# Driver on Demand

A MERN web app where customers hire **verified professional drivers to drive their own car**: for a few hours, a full day, an outstation trip, several days, an airport transfer or an event.

> "I have the vehicle. I just need a reliable driver."

## Roles

| Role | What they do |
|---|---|
| **Customer** | Books a driver: picks the trip type, pickup, destination, date, time, duration and their car; compares available drivers (rating, experience, distance, languages, price); tracks the booking live; shares start/end OTPs; pays cash; rates the driver. |
| **Driver** | Signs up, completes an onboarding profile (experience, languages, services, cars and gears they drive, rates, licence, emergency contact, base location), gets verified, goes online, accepts or rejects requests, runs the trip, records cash payment, rates the customer, sees earnings. |
| **Admin** | Verifies or rejects drivers, suspends drivers and customers, and sees platform stats and all bookings. |

## Booking types and pricing

Each driver sets three rates; the price of a booking is computed on the server from the chosen driver's rates:

| Type | Duration | Price |
|---|---|---|
| Hourly | 2–12 hours | hourly rate × hours |
| Airport | 2–6 hours | hourly rate × hours |
| Full Day | 8–14 hours | full-day rate (8 h) + extra hours × hourly rate |
| Event / Wedding | 4–14 hours | full-day rate (8 h) + extra hours × hourly rate |
| Outstation (one way / round trip) | 1–15 days | outstation per-day rate × days |
| Multiple Days | 2–30 days | outstation per-day rate × days |

The customer pays the driver in cash. The platform's commission (10% by default) comes out of that. Time-based trips that run more than 15 minutes over are charged each started extra hour at the hourly rate.

## Booking lifecycle

```
REQUESTED ──► DRIVER_ACCEPTED ──► DRIVER_ON_THE_WAY ──► DRIVER_ARRIVED ──► TRIP_STARTED ──► TRIP_COMPLETED ──► PAYMENT_COMPLETED ──► RATING_COMPLETED
    │                                   (start OTP)                          (end OTP)        (cash received)     (customer rates)
    ├──► DRIVER_REJECTED  (customer picks another driver)
    ├──► EXPIRED          (driver did not answer in 5 minutes)
    └──► CANCELLED        (by customer before the trip starts, or by driver after accepting)
```

- **No double booking:** when a driver accepts, every hour of the booking is reserved in the `driverAvailability` collection under a unique index, so two overlapping bookings can never both be accepted. Search hides drivers who are busy at that time.
- **OTPs:** the customer's app shows a start OTP once the driver accepts and an end OTP during the trip. Five wrong attempts lock that step for 15 minutes.
- **Real time:** Socket.IO pushes every change to both sides (new requests, acceptance, driver on the way, trip start/end, payment, verification).

## Tech stack

- **Frontend:** React (Vite), React Router, Tailwind CSS, Axios, TanStack Query, Zustand, React Hook Form, Zod, Socket.IO client, Leaflet (OpenStreetMap).
- **Backend:** Node.js, Express, Mongoose, JWT in HTTP-only cookies, bcryptjs, Socket.IO, Zod, Helmet, CORS, express-rate-limit, Nodemailer.
- **Database:** MongoDB (`users`, `drivers`, `bookings`, `driverAvailability`, `reviews`, `blacklisttokens`).
- **Maps:** the map is OpenStreetMap (Leaflet). Address search and road distances use free OpenStreetMap services (Photon, OSRM) by default, or Google Maps when `MAPS_PROVIDER=google` and a key are set.

## Run it locally

You need **Node.js 20+** and a MongoDB database (local, or a free MongoDB Atlas cluster).

```bash
# 1. Backend
cd Backend
cp .env.example .env          # set DB_CONNECT and JWT_SECRET
npm install
npm run create-admin -- admin@example.com "a-strong-password" "Your name"
npm start                     # http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

On Windows you can use the setup package instead: run `CREATE-ADMIN.bat` once, then `START-APP.bat`.

**Trying a full booking on one computer:** use a normal browser window for the customer, an incognito window for the driver and another browser for the admin (each role needs its own login cookie).

1. Driver: sign up → complete the profile → **Submit for verification**.
2. Admin: log in (role *Admin*) → **Drivers** → **Review** → **Verify driver**.
3. Driver: dashboard → switch to **Online**.
4. Customer: sign up → **Book a driver** with a pickup near the driver's base location → **Book driver**.
5. Driver: **Accept** → *on the way* → *arrived* → enter the customer's start OTP → later the end OTP → **Cash received**.
6. Customer: rate the driver.

Password reset emails are sent when `SMTP_*` settings are filled in; otherwise the reset link is printed in the backend console.

See [`Backend/README.md`](Backend/README.md) for the API reference.

## Not built yet

Online payments (Razorpay), live driver tracking and ETA on the map, SOS/emergency and trip sharing, document and photo upload (Cloudinary), driver working hours and time-off, chat, complaints, coupons, notifications history, payouts.
