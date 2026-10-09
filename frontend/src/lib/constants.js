export const BOOKING_TYPES = {
  hourly: { label: 'Hourly', icon: 'ri-time-line', unit: 'hours', min: 2, max: 12, default: 4, hint: 'A few hours in the city' },
  full_day: { label: 'Full Day', icon: 'ri-sun-line', unit: 'hours', min: 8, max: 14, default: 8, hint: '8 hours, extra hours charged' },
  outstation: { label: 'Outstation', icon: 'ri-road-map-line', unit: 'days', min: 1, max: 15, default: 1, needsDestination: true, hint: 'Out-of-city trips' },
  multi_day: { label: 'Multiple Days', icon: 'ri-calendar-2-line', unit: 'days', min: 2, max: 30, default: 3, hint: 'A driver for several days' },
  airport: { label: 'Airport', icon: 'ri-plane-line', unit: 'hours', min: 2, max: 6, default: 3, needsDestination: true, hint: 'Pickups and drops' },
  event: { label: 'Event / Wedding', icon: 'ri-cake-3-line', unit: 'hours', min: 4, max: 14, default: 8, hint: 'Weddings and functions' },
}

export const CAR_TYPES = { hatchback: 'Hatchback', sedan: 'Sedan', suv: 'SUV', muv: 'MUV', luxury: 'Luxury' }
export const TRANSMISSIONS = { manual: 'Manual', automatic: 'Automatic' }

export const STATUS = {
  requested: { label: 'Waiting for driver', tone: 'amber' },
  driver_accepted: { label: 'Driver confirmed', tone: 'teal' },
  driver_rejected: { label: 'Driver declined', tone: 'red' },
  driver_on_the_way: { label: 'Driver on the way', tone: 'teal' },
  driver_arrived: { label: 'Driver arrived', tone: 'teal' },
  trip_started: { label: 'Trip in progress', tone: 'blue' },
  trip_completed: { label: 'Trip completed', tone: 'blue' },
  payment_completed: { label: 'Paid', tone: 'green' },
  rating_completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
  expired: { label: 'Expired', tone: 'gray' },
}

// The happy path, for the progress timeline.
export const LIFECYCLE = ['requested', 'driver_accepted', 'driver_on_the_way', 'driver_arrived', 'trip_started', 'trip_completed', 'payment_completed', 'rating_completed']

export const VERIFICATION = {
  pending: { label: 'Profile incomplete', tone: 'gray' },
  under_review: { label: 'Under review', tone: 'amber' },
  verified: { label: 'Verified', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
}
