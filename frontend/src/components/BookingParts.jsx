import { useState } from 'react'
import { LIFECYCLE, STATUS, CAR_TYPES, TRANSMISSIONS } from '../lib/constants'
import { rupees, dateTime, durationLabel, bookingTypeLabel, rateLabel } from '../lib/format'
import { Button, Field, Textarea } from './ui'
import { cx } from '../lib/cx'

const ENDED = ['cancelled', 'driver_rejected', 'expired']

export function BookingTimeline({ booking }) {
  const reached = new Map(booking.statusHistory.map((h) => [h.status, h.at]))

  if (ENDED.includes(booking.status)) {
    const reason = booking.cancellation?.reason || booking.rejectionReason
    return (
      <div className='rounded-lg bg-gray-50 p-3 text-sm'>
        <p className='font-semibold'>{STATUS[booking.status].label}{booking.cancellation?.by && ` by ${booking.cancellation.by}`}</p>
        {reason && <p className='text-gray-600'>“{reason}”</p>}
      </div>
    )
  }

  const currentIndex = LIFECYCLE.indexOf(booking.status)

  return (
    <ol className='space-y-2'>
      {LIFECYCLE.map((status, index) => {
        const done = index <= currentIndex
        return (
          <li key={status} className='flex items-center gap-3 text-sm'>
            <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
              index === currentIndex ? 'bg-teal-700 text-white' : done ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-400')}>
              {done ? <i aria-hidden='true' className='ri-check-line' /> : index + 1}
            </span>
            <span className={cx(done ? 'font-medium text-gray-900' : 'text-gray-400')}>{STATUS[status].label}</span>
            {reached.get(status) && <span className='ml-auto text-xs text-gray-500'>{new Date(reached.get(status)).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>}
          </li>
        )
      })}
    </ol>
  )
}

export function Row({ icon, label, children }) {
  return (
    <div className='flex gap-3 py-2 text-sm'>
      <i aria-hidden='true' className={cx(icon, 'mt-0.5 text-gray-400')} />
      <div className='min-w-0'>
        <p className='text-xs text-gray-500'>{label}</p>
        <div className='break-words text-gray-900'>{children}</div>
      </div>
    </div>
  )
}

export function BookingDetails({ booking }) {
  return (
    <div className='divide-y divide-gray-100'>
      <Row icon='ri-steering-2-line' label='Booking'>{bookingTypeLabel(booking)} · {durationLabel(booking.duration)}</Row>
      <Row icon='ri-calendar-line' label='Schedule'>{dateTime(booking.startTime)} → {dateTime(booking.endTime)}</Row>
      <Row icon='ri-map-pin-user-line' label='Pickup'>{booking.pickup.address}</Row>
      {booking.destination && <Row icon='ri-map-pin-2-line' label='Destination'>{booking.destination.address}
        {booking.routeEstimate && <span className='text-gray-500'> · ~{booking.routeEstimate.distanceKm} km, {Math.round(booking.routeEstimate.durationMinutes / 60 * 10) / 10} h drive</span>}
      </Row>}
      <Row icon='ri-car-line' label='Your car'>{CAR_TYPES[booking.vehicle.type]} · {TRANSMISSIONS[booking.vehicle.transmission]}{booking.vehicle.model && ` · ${booking.vehicle.model}`}</Row>
      {booking.notes && <Row icon='ri-chat-1-line' label='Notes'>{booking.notes}</Row>}
    </div>
  )
}

export function PriceBreakdown({ pricing, perspective = 'customer' }) {
  return (
    <dl className='space-y-1 text-sm'>
      <div className='flex justify-between'><dt className='text-gray-600'>Rate</dt><dd>{rateLabel(pricing)}</dd></div>
      <div className='flex justify-between'><dt className='text-gray-600'>Booking charges</dt><dd>{rupees(pricing.baseCharges)}</dd></div>
      {pricing.extraCharges > 0 && <div className='flex justify-between'><dt className='text-gray-600'>Extra hours</dt><dd>{rupees(pricing.extraCharges)}</dd></div>}
      <div className='flex justify-between border-t border-gray-100 pt-1 font-semibold'><dt>Total (pay driver in cash)</dt><dd>{rupees(pricing.driverCharges)}</dd></div>
      {perspective === 'driver' && <>
        <div className='flex justify-between text-gray-600'><dt>Platform commission ({pricing.commissionPercent}%)</dt><dd>−{rupees(pricing.platformCommission)}</dd></div>
        <div className='flex justify-between font-semibold text-teal-800'><dt>Your earning</dt><dd>{rupees(pricing.driverEarning)}</dd></div>
      </>}
    </dl>
  )
}

export function OtpDisplay({ label, otp, hint }) {
  return (
    <div className='rounded-xl bg-teal-700 p-4 text-white'>
      <p className='text-sm text-teal-100'>{label}</p>
      <p className='font-mono text-3xl font-bold tracking-[0.4em]'>{otp}</p>
      <p className='mt-1 text-xs text-teal-100'>{hint}</p>
    </div>
  )
}

export function RatingForm({ title, onSubmit, loading }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  return (
    <form className='space-y-3' onSubmit={(e) => { e.preventDefault(); if (rating) onSubmit({ rating, comment: comment || undefined }) }}>
      <p className='font-semibold'>{title}</p>
      <div className='flex gap-1' role='radiogroup' aria-label='Rating'>
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type='button' role='radio' aria-checked={rating === star} aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => setRating(star)} className='text-3xl'>
            <i aria-hidden='true' className={star <= rating ? 'ri-star-fill text-amber-500' : 'ri-star-line text-gray-300'} />
          </button>
        ))}
      </div>
      <Field label='Review (optional)'>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder='How was your experience?' />
      </Field>
      <Button type='submit' disabled={!rating} loading={loading}>Submit rating</Button>
    </form>
  )
}
