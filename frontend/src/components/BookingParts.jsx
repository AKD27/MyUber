import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../lib/api'
import { LIFECYCLE, STATUS, TIMELINE_LABELS, CLOSED_STATUSES, CAR_TYPES, TRANSMISSIONS, BOOKING_TYPES, COMPLAINT_CATEGORIES } from '../lib/constants'
import { rupees, dateTime, clockTime, durationLabel, bookingTypeLabel, rateLabel, friendlyDateTime, minutesLabel, shortAddress, bookingRef } from '../lib/format'
import { toast } from '../store/toast'
import { Button, Card, ErrorNote, Field, Icon, Modal, Select, StatusBadge, Textarea } from './ui'
import { cx } from '../lib/cx'

const CLOSED_BY = { customer: 'the customer', driver: 'the driver', admin: 'support', system: 'the system' }

export function BookingTimeline({ booking }) {
  const reached = new Map(booking.statusHistory.map((h) => [h.status, h.at]))

  if (CLOSED_STATUSES.includes(booking.status)) {
    const reason = booking.cancellation?.reason || booking.rejectionReason
    return (
      <div className='rounded-xl bg-slate-50 p-3.5 text-sm'>
        <p className='font-bold text-slate-900'>{STATUS[booking.status].label}{booking.cancellation?.by && ` by ${CLOSED_BY[booking.cancellation.by]}`}</p>
        {reason && <p className='mt-0.5 text-slate-600'>“{reason}”</p>}
        <p className='mt-1 text-xs text-slate-400'>{dateTime(booking.statusHistory.at(-1).at)}</p>
      </div>
    )
  }

  const currentIndex = LIFECYCLE.indexOf(booking.status)

  return (
    <ol>
      {LIFECYCLE.map((status, index) => {
        const done = index <= currentIndex
        const last = index === LIFECYCLE.length - 1
        return (
          <li key={status} className='relative flex gap-3 pb-4 last:pb-0'>
            {!last && <span aria-hidden='true' className={cx('absolute left-[11px] top-6 h-full w-0.5', index < currentIndex ? 'bg-brand-500' : 'bg-slate-200')} />}
            <span className={cx('relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
              index === currentIndex ? 'bg-brand-600 text-white ring-4 ring-brand-100' : done ? 'bg-brand-500 text-white' : 'border-2 border-slate-200 bg-white')}>
              {done && <Icon name='ri-check-line' />}
            </span>
            <span className={cx('flex-1 pt-0.5 text-sm', index === currentIndex ? 'font-bold text-slate-900' : done ? 'font-medium text-slate-700' : 'text-slate-400')}>{TIMELINE_LABELS[status]}</span>
            {reached.get(status) && <span className='tabular pt-0.5 text-xs text-slate-400'>{clockTime(reached.get(status))}</span>}
          </li>
        )
      })}
    </ol>
  )
}

// Pickup and destination joined by a dotted line, as on a ticket.
export function RouteLine({ pickup, destination, compact }) {
  return (
    <div className='flex gap-3'>
      <div className='flex flex-col items-center pt-1.5'>
        <span className='h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-100' />
        {destination && <><span className='my-1 w-px flex-1 border-l-2 border-dotted border-slate-300' /><span className='h-2.5 w-2.5 rounded-sm bg-slate-900' /></>}
      </div>
      <div className={cx('min-w-0 flex-1', destination && 'space-y-3')}>
        <div className='min-w-0'>
          {!compact && <p className='text-xs font-medium text-slate-500'>Pickup</p>}
          <p className={cx('text-sm font-medium text-slate-900', compact && 'truncate')}>{compact ? shortAddress(pickup.address) : pickup.address}</p>
        </div>
        {destination && (
          <div className='min-w-0'>
            {!compact && <p className='text-xs font-medium text-slate-500'>Destination</p>}
            <p className={cx('text-sm font-medium text-slate-900', compact && 'truncate')}>{compact ? shortAddress(destination.address) : destination.address}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Fact({ icon, label, children }) {
  return (
    <div className='flex items-start gap-3'>
      <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600'><Icon name={icon} /></span>
      <div className='min-w-0'>
        <p className='text-xs font-medium text-slate-500'>{label}</p>
        <div className='break-words text-sm font-semibold text-slate-900'>{children}</div>
      </div>
    </div>
  )
}

export function BookingDetails({ booking, carLabel = 'Your car' }) {
  const estimate = booking.routeEstimate
  return (
    <div className='space-y-5'>
      <RouteLine pickup={booking.pickup} destination={booking.destination} />
      <div className='grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2'>
        <Fact icon={BOOKING_TYPES[booking.bookingType]?.icon || 'ri-steering-2-line'} label='Booking'>{bookingTypeLabel(booking)} · {durationLabel(booking.duration)}</Fact>
        <Fact icon='ri-calendar-event-line' label='Starts'>{friendlyDateTime(booking.startTime)}</Fact>
        <Fact icon='ri-timer-flash-line' label='Booked until'>{friendlyDateTime(booking.endTime)}</Fact>
        <Fact icon='ri-car-line' label={carLabel}>{CAR_TYPES[booking.vehicle.type]} · {TRANSMISSIONS[booking.vehicle.transmission]}{booking.vehicle.model && ` · ${booking.vehicle.model}`}</Fact>
        {estimate?.distanceKm > 0 && <Fact icon='ri-route-line' label='Route'>About {estimate.distanceKm} km · {minutesLabel(estimate.durationMinutes)} drive</Fact>}
        {booking.notes && <Fact icon='ri-chat-quote-line' label='Notes'>{booking.notes}</Fact>}
      </div>
    </div>
  )
}

function PriceRow({ label, children, className }) {
  return <div className={cx('flex items-baseline justify-between gap-3', className)}><dt>{label}</dt><dd className='tabular whitespace-nowrap'>{children}</dd></div>
}

export function PriceBreakdown({ pricing, perspective = 'customer', paid }) {
  return (
    <dl className='space-y-2 text-sm text-slate-600'>
      <PriceRow label='Rate'>{rateLabel(pricing)}</PriceRow>
      <PriceRow label='Driver charges'>{rupees(pricing.baseCharges)}</PriceRow>
      {pricing.extraCharges > 0 && <PriceRow label='Extra hours'>{rupees(pricing.extraCharges)}</PriceRow>}
      <PriceRow label={paid ? 'Total paid' : 'Total'} className='border-t border-dashed border-slate-200 pt-2.5 text-base font-extrabold text-slate-900'>{rupees(pricing.driverCharges)}</PriceRow>
      {perspective === 'driver' ? (
        <>
          <PriceRow label={`Platform fee (${pricing.commissionPercent}%)`}>−{rupees(pricing.platformCommission)}</PriceRow>
          <PriceRow label='You keep' className='rounded-xl bg-brand-50 px-3 py-2.5 font-extrabold text-brand-800'>{rupees(pricing.driverEarning)}</PriceRow>
        </>
      ) : (
        <p className='flex items-center gap-1.5 pt-1 text-xs text-slate-500'><Icon name='ri-money-rupee-circle-line' className='text-sm' />{paid ? 'Paid in cash to the driver' : 'Pay the driver in cash when the trip ends. No booking fee.'}</p>
      )}
    </dl>
  )
}

export function OtpDisplay({ label, otp, hint }) {
  return (
    <div className='overflow-hidden rounded-2xl bg-slate-900 text-white shadow-card'>
      <div className='flex items-center justify-between gap-4 p-4 sm:p-5'>
        <div className='min-w-0'>
          <p className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-400'><Icon name='ri-key-2-fill' />{label}</p>
          <p className='mt-1 text-sm text-slate-300'>{hint}</p>
        </div>
        <div className='flex gap-1.5' aria-label={`${label}: ${otp.split('').join(' ')}`}>
          {otp.split('').map((digit, index) => (
            <span key={index} aria-hidden='true' className='tabular flex h-12 w-10 items-center justify-center rounded-xl bg-white/10 text-2xl font-extrabold ring-1 ring-inset ring-white/10'>{digit}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

const RATING_WORDS = ['', 'Poor', 'Below average', 'Okay', 'Good', 'Excellent']

export function RatingForm({ title, onSubmit, loading }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const shown = hover || rating

  return (
    <form className='space-y-4 text-center' onSubmit={(e) => { e.preventDefault(); if (rating) onSubmit({ rating, comment: comment.trim() || undefined }) }}>
      <div>
        <p className='text-lg font-bold text-slate-900'>{title}</p>
        <p className='h-5 text-sm font-medium text-amber-600'>{RATING_WORDS[shown]}</p>
      </div>
      <div className='flex justify-center gap-1' role='radiogroup' aria-label='Rating' onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type='button' role='radio' aria-checked={rating === star} aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => setRating(star)} onMouseEnter={() => setHover(star)} className='rounded-lg p-1 text-4xl transition-transform duration-150 hover:scale-125 active:scale-90'>
            <Icon name={star <= shown ? 'ri-star-fill' : 'ri-star-line'} className={star <= shown ? 'text-amber-400' : 'text-slate-300'} />
          </button>
        ))}
      </div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder='Tell us more (optional)' aria-label='Review' className='text-left' />
      <Button type='submit' variant='brand' className='w-full' disabled={!rating} loading={loading}>Submit rating</Button>
    </form>
  )
}

// One booking in a list, for either side.
export function BookingCard({ booking, to, perspective }) {
  const other = perspective === 'driver' ? booking.customer : booking.driver
  return (
    <Link to={to} className='block rounded-2xl'>
      <Card className='duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl', BOOKING_TYPES[booking.bookingType]?.tint)}><Icon name={BOOKING_TYPES[booking.bookingType]?.icon} /></span>
            <div className='min-w-0'>
              <p className='truncate font-bold text-slate-900'>{bookingTypeLabel(booking)} · {durationLabel(booking.duration)}</p>
              <p className='text-[13px] text-slate-500'>{friendlyDateTime(booking.startTime)}</p>
            </div>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <div className='mt-4'><RouteLine pickup={booking.pickup} destination={booking.destination} compact /></div>
        <div className='mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm'>
          <span className='truncate text-slate-500'>{perspective === 'driver' ? 'Customer' : 'Driver'}: <b className='font-semibold text-slate-800'>{other?.fullname?.firstname} {other?.fullname?.lastname}</b> · <span className='tabular'>{bookingRef(booking)}</span></span>
          <span className='tabular whitespace-nowrap font-extrabold text-slate-900'>
            {perspective === 'driver' ? <>{rupees(booking.pricing.driverEarning)} <span className='text-xs font-medium text-slate-500'>earning</span></> : rupees(booking.pricing.driverCharges)}
          </span>
        </div>
      </Card>
    </Link>
  )
}

// "Report an issue" about a booking (or in general, without one).
export function ComplaintDialog({ open, onClose, bookingId }) {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

  const submit = useMutation({
    mutationFn: () => api.post('/support/complaints', { bookingId, category, description: description.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      toast('Thanks — support will look into this and reply in the app.', 'success')
      setCategory('')
      setDescription('')
      onClose()
    },
  })

  const valid = category && description.trim().length >= 10

  return (
    <Modal open={open} onClose={onClose} title='Report an issue'>
      <form className='space-y-4' onSubmit={(e) => { e.preventDefault(); if (valid) submit.mutate() }}>
        <Field label='What is this about?'>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value='' disabled>Choose a topic</option>
            {Object.entries(COMPLAINT_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
        <Field label='What happened?' hint={`${description.trim().length}/2000 · at least 10 characters`}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder='Describe the issue so our team can help quickly' className='min-h-32' />
        </Field>
        <ErrorNote>{submit.error && errorMessage(submit.error)}</ErrorNote>
        <div className='flex gap-2'>
          <Button variant='secondary' className='flex-1' onClick={onClose}>Cancel</Button>
          <Button type='submit' className='flex-1' disabled={!valid} loading={submit.isPending}>Send to support</Button>
        </div>
      </form>
    </Modal>
  )
}
