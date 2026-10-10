// Booking types offered to customers, with how their duration is chosen.
const BOOKING_TYPES = {
    hourly: { label: 'Hourly', unit: 'hours', min: 2, max: 12 },
    full_day: { label: 'Full Day', unit: 'hours', min: 8, max: 14 },
    outstation: { label: 'Outstation', unit: 'days', min: 1, max: 15, needsDestination: true },
    multi_day: { label: 'Multiple Days', unit: 'days', min: 2, max: 30 },
    airport: { label: 'Airport', unit: 'hours', min: 2, max: 6, needsDestination: true },
    event: { label: 'Event / Wedding', unit: 'hours', min: 4, max: 14 }
};

// Hours covered by a driver's full-day rate; longer time-based bookings pay extra hours.
const FULL_DAY_HOURS = 8;

const OUTSTATION_TRIP_TYPES = [ 'one_way', 'round_trip' ];

const CAR_TYPES = [ 'hatchback', 'sedan', 'suv', 'muv', 'luxury' ];
const TRANSMISSIONS = [ 'manual', 'automatic' ];

const BOOKING_STATUS = {
    REQUESTED: 'requested',
    DRIVER_ACCEPTED: 'driver_accepted',
    DRIVER_REJECTED: 'driver_rejected',
    DRIVER_ON_THE_WAY: 'driver_on_the_way',
    DRIVER_ARRIVED: 'driver_arrived',
    TRIP_STARTED: 'trip_started',
    TRIP_COMPLETED: 'trip_completed',
    PAYMENT_COMPLETED: 'payment_completed',
    RATING_COMPLETED: 'rating_completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired'
};

// Statuses during which the driver's time is committed to the booking.
const ACTIVE_BOOKING_STATUSES = [
    BOOKING_STATUS.DRIVER_ACCEPTED,
    BOOKING_STATUS.DRIVER_ON_THE_WAY,
    BOOKING_STATUS.DRIVER_ARRIVED,
    BOOKING_STATUS.TRIP_STARTED
];

// Statuses during which the customer can follow the driver on the map.
const TRACKING_STATUSES = [
    BOOKING_STATUS.DRIVER_ON_THE_WAY,
    BOOKING_STATUS.DRIVER_ARRIVED,
    BOOKING_STATUS.TRIP_STARTED
];

const COMPLAINT_CATEGORIES = [ 'driver_behaviour', 'customer_behaviour', 'payment', 'safety', 'late_or_no_show', 'vehicle_damage', 'app_issue', 'other' ];
const COMPLAINT_STATUS = [ 'open', 'in_review', 'resolved' ];

const DRIVER_VERIFICATION = {
    PENDING: 'pending',
    UNDER_REVIEW: 'under_review',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
};

const ACCOUNT_STATUS = [ 'active', 'suspended' ];

module.exports = {
    BOOKING_TYPES,
    FULL_DAY_HOURS,
    OUTSTATION_TRIP_TYPES,
    CAR_TYPES,
    TRANSMISSIONS,
    BOOKING_STATUS,
    ACTIVE_BOOKING_STATUSES,
    TRACKING_STATUSES,
    COMPLAINT_CATEGORIES,
    COMPLAINT_STATUS,
    DRIVER_VERIFICATION,
    ACCOUNT_STATUS
};
