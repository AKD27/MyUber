import { BOOKING_TYPES } from './constants'

export const rupees = (amount) => `₹${Math.round(amount || 0).toLocaleString('en-IN')}`

export const fullName = (person) => [person?.fullname?.firstname, person?.fullname?.lastname].filter(Boolean).join(' ')

export const dateTime = (value) =>
  new Date(value).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export const shortDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const durationLabel = (duration) =>
  `${duration.value} ${duration.unit === 'days' ? (duration.value === 1 ? 'day' : 'days') : (duration.value === 1 ? 'hour' : 'hours')}`

export const bookingTypeLabel = (booking) => {
  const label = BOOKING_TYPES[booking.bookingType]?.label || booking.bookingType
  if (booking.bookingType === 'outstation' && booking.tripType) return `${label} · ${booking.tripType === 'round_trip' ? 'Round trip' : 'One way'}`
  return label
}

export const rateLabel = (pricing) => {
  if (pricing.rateUnit === 'hour') return `${rupees(pricing.rate)}/hour`
  if (pricing.rateUnit === 'day') return `${rupees(pricing.rate)}/day`
  return `${rupees(pricing.rate)} for 8 hours`
}

// Local date (YYYY-MM-DD) and time (HH:mm) inputs combined into an ISO timestamp.
export const toIso = (date, time) => new Date(`${date}T${time}`).toISOString()

export const todayInput = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
