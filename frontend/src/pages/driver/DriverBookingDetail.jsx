import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { ACTIVE_STATUSES, CLOSED_STATUSES, TRACKING_STATUSES } from '../../lib/constants'
import { rupees, bookingRef, friendlyDateTime } from '../../lib/format'
import { placePoint, directionsUrl } from '../../lib/places'
import { toast } from '../../store/toast'
import { useRoute } from '../../hooks/useRoute'
import { useDriverLocation } from '../../hooks/useDriverLocation'
import Avatar from '../../components/Avatar'
import MapView from '../../components/MapView'
import MapShell from '../../components/MapShell'
import SafetySheet from '../../components/SafetySheet'
import { BookingDetails, BookingTimeline, ComplaintDialog, PriceBreakdown, RatingForm } from '../../components/BookingParts'
import { Button, buttonClass, Card, ErrorNote, Field, Icon, Modal, Note, SectionTitle, Spinner, Stars, StatusBadge, Textarea } from '../../components/ui'

const BEFORE_START = ['driver_accepted', 'driver_on_the_way', 'driver_arrived']

// What the driver should do at each stage.
const STEPS = {
  requested: ['New booking request', 'Accept to confirm this booking, or decline so the customer can choose another driver.'],
  driver_accepted: ['Booking confirmed', 'Tap “I’m on the way” when you set off for the pickup.'],
  driver_on_the_way: ['Heading to pickup', 'Your position is shared with the customer. Tap “I’ve arrived” at the pickup.'],
  driver_arrived: ['At the pickup', 'Ask the customer for their start OTP to begin the trip.'],
  trip_started: ['Trip in progress', 'When the trip is over, ask the customer for their end OTP.'],
  trip_completed: ['Collect payment', 'Collect the cash from the customer, then confirm it here.'],
  payment_completed: ['Trip complete', 'Payment recorded. Rate the customer to finish.'],
  rating_completed: ['Trip complete', 'This booking is finished. Thank you!'],
  driver_rejected: ['Request declined', 'This booking is closed.'],
  expired: ['Request expired', 'The request was not answered in time.'],
  cancelled: ['Booking cancelled', 'This booking is closed.'],
}

function OtpForm({ label, action, loading, onSubmit }) {
  const [otp, setOtp] = useState('')
  return (
    <form className='space-y-3' onSubmit={(e) => { e.preventDefault(); if (otp.length === 4) onSubmit(otp) }}>
      <label className='block'>
        <span className='mb-1.5 block text-[13px] font-semibold text-slate-700'>{label}</span>
        <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode='numeric' autoComplete='one-time-code' placeholder='••••' aria-label={label}
          className='tabular h-14 w-full rounded-xl border border-slate-200 bg-white text-center text-3xl font-extrabold tracking-[0.5em] text-slate-900 shadow-sm outline-none placeholder:text-slate-300 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10' />
      </label>
      <Button type='submit' variant='brand' size='lg' className='w-full' disabled={otp.length !== 4} loading={loading}>{action}</Button>
    </form>
  )
}

export default function DriverBookingDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState(null) // 'reject' | 'cancel' | 'safety' | 'complaint'
  const [reason, setReason] = useState('')

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then((res) => res.data),
  })

  const action = useMutation({
    mutationFn: ({ path, body }) => api.post(`/bookings/${id}/${path}`, body || {}).then((res) => res.data),
    onSuccess: (updated, { success }) => {
      queryClient.setQueryData(['booking', id], updated)
      setDialog(null)
      setReason('')
      if (success) toast(success, 'success')
    },
    // Also after an error: the booking may have changed on the customer's side.
    onSettled: (updated) => {
      if (!updated) queryClient.invalidateQueries({ queryKey: ['booking', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['driver-earnings'] })
    },
  })

  const run = (path, success, body) => action.mutate({ path, body, success })
  const openDialog = (name) => { action.reset(); setReason(''); setDialog(name) }

  const status = booking?.status
  // The customer follows the driver on the map from "on the way" until the trip ends.
  useDriverLocation(TRACKING_STATUSES.includes(status) ? 'live' : null)

  const pickup = placePoint(booking?.pickup, 'Pickup', 'pickup')
  const destination = placePoint(booking?.destination, 'Destination', 'destination')
  const route = useRoute(pickup, destination)

  if (isLoading) return <Spinner />
  if (error) return <ErrorNote>{errorMessage(error)}</ErrorNote>

  const { customer } = booking
  const busy = action.isPending
  const closed = CLOSED_STATUSES.includes(status)
  const [stepTitle, stepText] = STEPS[status]
  const navigateTo = status === 'trip_started' ? destination : BEFORE_START.includes(status) ? pickup : null
  // Errors from the reject/cancel dialogs are shown inside them.
  const stepError = action.error && !dialog ? errorMessage(action.error) : null

  return (
    <>
      <MapShell map={<MapView fill points={[pickup, destination]} path={route?.path} />}>
      <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Link to='/driver/bookings' aria-label='Back to bookings' className='-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-600 hover:bg-slate-200/60'><Icon name='ri-arrow-left-line' /></Link>
          <h1 className='text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl'>Booking <span className='tabular text-slate-400'>{bookingRef(booking)}</span></h1>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className='space-y-4'>
        <div className='space-y-4'>
          <Card className={closed ? '' : 'border-slate-900/10 ring-1 ring-slate-900/5'}>
            <p className='text-xs font-bold uppercase tracking-wider text-brand-700'>{closed ? 'Closed' : 'Next step'}</p>
            <p className='mt-1 text-xl font-extrabold tracking-tight text-slate-900'>{stepTitle}</p>
            <p className='mt-0.5 text-sm text-slate-500'>{status === 'cancelled' && booking.cancellation?.reason ? `“${booking.cancellation.reason}”` : stepText}</p>

            <div className='mt-4 space-y-3'>
              <ErrorNote>{stepError}</ErrorNote>

              {status === 'requested' && (
                <div className='flex gap-2'>
                  <Button variant='secondary' size='lg' className='flex-1' disabled={busy} onClick={() => openDialog('reject')}>Decline</Button>
                  <Button variant='brand' size='lg' className='flex-[2]' loading={busy && !dialog} onClick={() => run('accept', 'Booking accepted')}>Accept booking</Button>
                </div>
              )}

              {status === 'driver_accepted' && (
                <Button variant='brand' size='lg' className='w-full' loading={busy && !dialog} onClick={() => run('on-the-way')}><Icon name='ri-navigation-fill' />I’m on the way</Button>
              )}

              {status === 'driver_on_the_way' && (
                <Button variant='brand' size='lg' className='w-full' loading={busy && !dialog} onClick={() => run('arrived')}><Icon name='ri-map-pin-user-fill' />I’ve arrived at the pickup</Button>
              )}

              {status === 'driver_arrived' && (
                <OtpForm label='Start OTP from the customer' action='Start trip' loading={busy && !dialog} onSubmit={(otp) => run('start', 'Trip started', { otp })} />
              )}

              {status === 'trip_started' && (
                <OtpForm label='End OTP from the customer' action='End trip' loading={busy && !dialog} onSubmit={(otp) => run('complete', 'Trip completed', { otp })} />
              )}

              {status === 'trip_completed' && (
                <Button variant='brand' size='lg' className='w-full' loading={busy} onClick={() => run('payment-received', 'Payment recorded')}>
                  <Icon name='ri-money-rupee-circle-fill' />I received {rupees(booking.pricing.driverCharges)} in cash
                </Button>
              )}

              {navigateTo && (
                <a href={directionsUrl(navigateTo)} target='_blank' rel='noreferrer' className={buttonClass({ variant: 'secondary', className: 'w-full' })}>
                  <Icon name='ri-direction-line' />Navigate to {status === 'trip_started' ? 'destination' : 'pickup'}
                </a>
              )}
            </div>
          </Card>

          {['payment_completed', 'rating_completed'].includes(status) && !booking.driverReview && (
            <Card><RatingForm title={`Rate ${customer.fullname.firstname}`} loading={busy} onSubmit={(body) => run('review-customer', 'Thanks for your rating', body)} /></Card>
          )}


          <Card>
            <div className='flex items-center gap-3.5'>
              <Avatar person={customer} size='h-14 w-14' />
              <div className='min-w-0 flex-1'>
                <p className='truncate font-bold text-slate-900'>{customer.fullname.firstname} {customer.fullname.lastname}</p>
                <p className='text-[13px] text-slate-500'>Customer · <Stars value={customer.rating?.average} count={customer.rating?.count} size='text-[13px]' /></p>
              </div>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} aria-label={`Call ${customer.fullname.firstname}`} className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xl text-white shadow-sm hover:bg-brand-700'>
                  <Icon name='ri-phone-fill' />
                </a>
              )}
            </div>
            {status === 'requested' && <p className='mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500'>The customer’s phone number is shared once you accept.</p>}
            {(ACTIVE_STATUSES.includes(status) || status === 'trip_completed') && (
              <div className='mt-4 border-t border-slate-100 pt-4'>
                <Button variant='danger-soft' className='w-full' onClick={() => setDialog('safety')}><Icon name='ri-alarm-warning-fill' />SOS · Safety options</Button>
              </div>
            )}
          </Card>

          <Card><SectionTitle>Trip details</SectionTitle><BookingDetails booking={booking} carLabel='Customer’s car' /></Card>
        </div>

        <div className='space-y-4'>
          <Card><SectionTitle>Earnings</SectionTitle><PriceBreakdown pricing={booking.pricing} perspective='driver' /></Card>
          {status === 'trip_started' && (
            <Note tone='blue' icon='ri-timer-line'>Booked until {friendlyDateTime(booking.endTime)}. Time beyond that (after 15 minutes’ grace) is added as extra hours.</Note>
          )}
          <Card><SectionTitle>Progress</SectionTitle><BookingTimeline booking={booking} /></Card>

          <div className='flex flex-col gap-2'>
            {BEFORE_START.includes(status) && <Button variant='danger-soft' onClick={() => openDialog('cancel')}>Cancel this booking</Button>}
            <Button variant='ghost' onClick={() => setDialog('complaint')}><Icon name='ri-flag-line' />Report an issue</Button>
          </div>
        </div>
      </div>
      </MapShell>

      <Modal open={dialog === 'reject' || dialog === 'cancel'} onClose={() => setDialog(null)} title={dialog === 'reject' ? 'Decline this request?' : 'Cancel this booking?'}>
        <div className='space-y-4'>
          {dialog === 'cancel' && <Note tone='amber' icon='ri-error-warning-fill'>Cancelling after accepting raises your cancellation rate, which customers see on your profile.</Note>}
          <Field label='Reason' optional><Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder='Let the customer know why' className='min-h-[72px]' /></Field>
          <ErrorNote>{action.error && errorMessage(action.error)}</ErrorNote>
          <div className='flex gap-2'>
            <Button variant='secondary' className='flex-1' onClick={() => setDialog(null)}>Go back</Button>
            <Button variant='danger' className='flex-1' loading={busy}
              onClick={() => run(dialog === 'reject' ? 'reject' : 'driver-cancel', dialog === 'reject' ? 'Request declined' : 'Booking cancelled', { reason: reason.trim() || undefined })}>
              {dialog === 'reject' ? 'Decline request' : 'Cancel booking'}
            </Button>
          </div>
        </div>
      </Modal>

      <SafetySheet open={dialog === 'safety'} onClose={() => setDialog(null)} bookingId={id} />
      <ComplaintDialog open={dialog === 'complaint'} onClose={() => setDialog(null)} bookingId={id} />
    </>
  )
}
