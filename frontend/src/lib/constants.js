export const BOOKING_TYPES = {
  hourly: { label: 'Hourly', icon: 'ri-time-fill', tint: 'bg-slate-100 text-slate-900', unit: 'hours', min: 2, max: 12, default: 4, hint: 'A few hours in the city' },
  full_day: { label: 'Full Day', icon: 'ri-sun-fill', tint: 'bg-slate-100 text-slate-900', unit: 'hours', min: 8, max: 14, default: 8, hint: '8 hours, extra hours charged' },
  outstation: { label: 'Outstation', icon: 'ri-road-map-fill', tint: 'bg-slate-100 text-slate-900', unit: 'days', min: 1, max: 15, default: 1, needsDestination: true, hint: 'Out-of-city trips' },
  multi_day: { label: 'Multiple Days', icon: 'ri-calendar-2-fill', tint: 'bg-slate-100 text-slate-900', unit: 'days', min: 2, max: 30, default: 3, hint: 'A driver for several days' },
  airport: { label: 'Airport', icon: 'ri-plane-fill', tint: 'bg-slate-100 text-slate-900', unit: 'hours', min: 2, max: 6, default: 3, needsDestination: true, hint: 'Pickups and drops' },
  event: { label: 'Event / Wedding', icon: 'ri-cake-3-fill', tint: 'bg-slate-100 text-slate-900', unit: 'hours', min: 4, max: 14, default: 8, hint: 'Weddings and functions' },
}

export const CAR_TYPES = { hatchback: 'Hatchback', sedan: 'Sedan', suv: 'SUV', muv: 'MUV', luxury: 'Luxury' }
export const TRANSMISSIONS = { manual: 'Manual', automatic: 'Automatic' }

export const STATUS = {
  requested: { label: 'Waiting for driver', tone: 'amber' },
  driver_accepted: { label: 'Driver confirmed', tone: 'brand' },
  driver_rejected: { label: 'Driver declined', tone: 'red' },
  driver_on_the_way: { label: 'Driver on the way', tone: 'blue' },
  driver_arrived: { label: 'Driver arrived', tone: 'blue' },
  trip_started: { label: 'Trip in progress', tone: 'blue' },
  trip_completed: { label: 'Payment due', tone: 'amber' },
  payment_completed: { label: 'Paid', tone: 'green' },
  rating_completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
  expired: { label: 'Expired', tone: 'gray' },
}

// The happy path, for the progress timeline.
export const LIFECYCLE = ['requested', 'driver_accepted', 'driver_on_the_way', 'driver_arrived', 'trip_started', 'trip_completed', 'payment_completed', 'rating_completed']

export const TIMELINE_LABELS = {
  requested: 'Booking requested',
  driver_accepted: 'Driver confirmed',
  driver_on_the_way: 'Driver on the way',
  driver_arrived: 'Driver arrived',
  trip_started: 'Trip started',
  trip_completed: 'Trip completed',
  payment_completed: 'Payment received',
  rating_completed: 'Rated',
}

// From acceptance until the trip ends: contact, sharing and SOS are available.
export const ACTIVE_STATUSES = ['driver_accepted', 'driver_on_the_way', 'driver_arrived', 'trip_started']
// The driver's position is shown on the map.
export const TRACKING_STATUSES = ['driver_on_the_way', 'driver_arrived', 'trip_started']
export const CANCELLABLE_STATUSES = ['requested', 'driver_accepted', 'driver_on_the_way', 'driver_arrived']
export const CLOSED_STATUSES = ['cancelled', 'driver_rejected', 'expired']

export const VERIFICATION = {
  pending: { label: 'Profile incomplete', tone: 'gray' },
  under_review: { label: 'Under review', tone: 'amber' },
  verified: { label: 'Verified', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
}

export const COMPLAINT_CATEGORIES = {
  driver_behaviour: 'Driver behaviour',
  customer_behaviour: 'Customer behaviour',
  payment: 'Payment or charges',
  safety: 'Safety concern',
  late_or_no_show: 'Late or did not show up',
  vehicle_damage: 'Damage to the car',
  app_issue: 'Problem with the app',
  other: 'Something else',
}

export const COMPLAINT_STATUS = {
  open: { label: 'Open', tone: 'amber' },
  in_review: { label: 'In review', tone: 'blue' },
  resolved: { label: 'Resolved', tone: 'green' },
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Shown on the SOS screen; set VITE_SUPPORT_PHONE to your support line.
export const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || ''
export const EMERGENCY_NUMBER = '112'
