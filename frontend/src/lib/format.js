import { BOOKING_TYPES } from './constants'

export const rupees = (amount) => `₹${Math.round(amount || 0).toLocaleString('en-IN')}`

export const fullName = (person) => [person?.fullname?.firstname, person?.fullname?.lastname].filter(Boolean).join(' ')

export const dateTime = (value) =>
  new Date(value).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export const shortDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const clockTime = (value) => new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

// "Today, 4:30 pm", "Tomorrow, 9:00 am" or "Sat, 12 Oct, 9:00 am".
export const friendlyDateTime = (value) => {
  const date = new Date(value)
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / (24 * 60 * 60 * 1000))
  if (days === 0) return `Today, ${clockTime(date)}`
  if (days === 1) return `Tomorrow, ${clockTime(date)}`
  if (days === -1) return `Yesterday, ${clockTime(date)}`
  return dateTime(date)
}

export const timeAgo = (value) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`
  return shortDate(value)
}

export const durationLabel = (duration) =>
  `${duration.value} ${duration.unit === 'days' ? (duration.value === 1 ? 'day' : 'days') : (duration.value === 1 ? 'hour' : 'hours')}`

// 95 → "1 h 35 min"
export const minutesLabel = (minutes) => {
  const total = Math.max(1, Math.round(minutes))
  if (total < 60) return `${total} min`
  const rest = total % 60
  return rest ? `${Math.floor(total / 60)} h ${rest} min` : `${Math.floor(total / 60)} h`
}

export const kmLabel = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`)

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

export const bookingRef = (booking) => `#${booking._id.slice(-6).toUpperCase()}`

// Local date (YYYY-MM-DD) and time (HH:mm) inputs combined into an ISO timestamp.
export const toIso = (date, time) => new Date(`${date}T${time}`).toISOString()

const pad = (n) => String(n).padStart(2, '0')

export const dateInput = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayInput = () => dateInput()

// The first letters of a short place name, e.g. "Hazratganj, Lucknow, UP" → "Hazratganj, Lucknow".
export const shortAddress = (address = '') => address.split(',').slice(0, 2).join(',').trim()
