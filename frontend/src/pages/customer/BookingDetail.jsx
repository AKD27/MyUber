import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { ACTIVE_STATUSES, CANCELLABLE_STATUSES, CLOSED_STATUSES, TRACKING_STATUSES } from '../../lib/constants'
import { rupees, kmLabel, minutesLabel, bookingRef, timeAgo, friendlyDateTime } from '../../lib/format'
import { placePoint } from '../../lib/places'
import { toast } from '../../store/toast'
import { useRoute } from '../../hooks/useRoute'
import Avatar from '../../components/Avatar'
import MapView from '../../components/MapView'
import MapShell from '../../components/MapShell'
import SafetySheet, { useShareTrip } from '../../components/SafetySheet'
import { Radar, SuccessCheck } from '../../components/Motion'
import { BookingDetails, BookingTimeline, ComplaintDialog, OtpDisplay, PriceBreakdown, RatingForm } from '../../components/BookingParts'
import { Button, buttonClass, Card, ErrorNote, Field, Icon, Modal, Note, SectionTitle, Spinner, Stars, StatusBadge, Textarea } from '../../components/ui'

// The headline for each stage, from the customer's point of view.
const headline = (booking, eta) => {
  const name = booking.driver.fullname.firstname
  switch (booking.status) {
    case 'requested': return { icon: 'ri-time-line', title: `Waiting for ${name} to confirm`, text: 'Drivers usually answer within a few minutes. You will be notified here.', pulse: true }
    case 'driver_accepted': return { icon: 'ri-checkbox-circle-fill', title: `${name} confirmed your booking`, text: `${name} will set off for your pickup before ${friendlyDateTime(booking.startTime)}.` }
    case 'driver_on_the_way': return { icon: 'ri-steering-2-fill', title: `${name} is on the way`, text: eta ? `${kmLabel(eta.distanceKm)} away · arriving in about ${minutesLabel(eta.durationMinutes)}` : 'Follow them on the map.', pulse: true }
    case 'driver_arrived': return { icon: 'ri-map-pin-user-fill', title: `${name} has arrived`, text: 'Share your start OTP to begin the trip.' }
    case 'trip_started': return { icon: 'ri-road-map-fill', title: 'Your trip is in progress', text: eta ? `${kmLabel(eta.distanceKm)} to your destination · about ${minutesLabel(eta.durationMinutes)}` : 'Share your end OTP when the trip is over.', pulse: true }
    case 'trip_completed': return { icon: 'ri-money-rupee-circle-fill', title: `Pay ${rupees(booking.pricing.driverCharges)} in cash`, text: `Hand the amount to ${name}; they will confirm it in their app.` }
    case 'payment_completed': return { icon: 'ri-star-smile-fill', title: 'Trip complete', text: `How was your trip with ${name}?` }
    case 'rating_completed': return { icon: 'ri-checkbox-circle-fill', title: 'Trip complete', text: 'Thanks for booking with us.' }
    case 'driver_rejected': return { icon: 'ri-close-circle-fill', title: `${name} could not take this booking`, text: 'Choose another driver for the same trip.', closed: true }
    case 'expired': return { icon: 'ri-timer-line', title: `${name} did not respond in time`, text: 'Choose another driver for the same trip.', closed: true }
    default: return { icon: 'ri-close-circle-fill', title: 'This booking was cancelled', text: booking.cancellation?.reason, closed: true }
  }
}

export default function CustomerBookingDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState(null) // 'cancel' | 'safety' | 'complaint'
  const [reason, setReason] = useState('')

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then((res) => res.data),
    // A safety net in case a live update was missed while the phone was asleep.
    refetchInterval: (query) => (CANCELLABLE_STATUSES.includes(query.state.data?.status) || query.state.data?.status === 'trip_started' ? 20 * 1000 : false),
  })

  const onUpdated = (updated) => {
    queryClient.setQueryData(['booking', id], updated)
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  const cancel = useMutation({
    mutationFn: () => api.post(`/bookings/${id}/cancel`, { reason: reason.trim() || undefined }).then((res) => res.data),
    onSuccess: (updated) => { onUpdated(updated); setDialog(null); setReason(''); toast('Booking cancelled') },
  })

  const review = useMutation({
    mutationFn: (body) => api.post(`/bookings/${id}/review`, body).then((res) => res.data),
    onSuccess: (updated) => { onUpdated(updated); toast('Thanks for rating your driver!', 'success') },
  })

  const share = useShareTrip(id)

  const status = booking?.status
  const pickup = placePoint(booking?.pickup, 'Pickup', 'pickup')
  const destination = placePoint(booking?.destination, 'Destination', 'destination')
  const tracking = TRACKING_STATUSES.includes(status) && booking.driverLocation
  const driverPoint = tracking ? { ...booking.driverLocation, label: booking.driver.fullname.firstname, kind: 'driver' } : null

  // Before the trip the driver is heading to the pickup; during it, to the destination.
  const liveTarget = status === 'trip_started' ? destination : status === 'driver_on_the_way' ? pickup : null
  const liveRoute = useRoute(driverPoint, liveTarget)
  const plannedRoute = useRoute(pickup, destination)

  if (isLoading) return <Spinner />
  if (error) return <ErrorNote>{errorMessage(error)}</ErrorNote>

  const { driver } = booking
  const active = ACTIVE_STATUSES.includes(status)
  const head = headline(booking, liveRoute)
  const path = (driverPoint && liveTarget ? liveRoute?.path : null) || plannedRoute?.path

  return (
    <>
      <MapShell map={<MapView fill points={[pickup, destination, driverPoint]} path={path} />}>
      <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Link to='/bookings' aria-label='Back to my bookings' className='-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-600 hover:bg-slate-200/60'><Icon name='ri-arrow-left-line' /></Link>
          <h1 className='text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl'>Booking <span className='tabular text-slate-400'>{bookingRef(booking)}</span></h1>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className='space-y-4'>
        <div className='stagger space-y-4'>
          <div className={`flex items-center gap-4 rounded-2xl p-4 shadow-card sm:p-5 ${head.closed ? 'bg-white ring-1 ring-slate-200' : 'bg-brand-600 text-white'}`}>
            <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${head.closed ? 'bg-slate-100 text-slate-500' : 'bg-white/15'}`}>
              {['payment_completed', 'rating_completed'].includes(status) ? <SuccessCheck /> : <Icon name={head.icon} />}
              {head.pulse && <span className='absolute inset-0 animate-ping rounded-full bg-white/20' />}
            </span>
            <div className='min-w-0 flex-1'>
              <p className='text-lg font-extrabold leading-snug tracking-tight'>{head.title}</p>
              {head.text && <p className={`text-sm ${head.closed ? 'text-slate-500' : 'text-brand-50'}`}>{head.text}</p>}
            </div>
            {head.closed && status !== 'cancelled' && <Link to='/book' className={buttonClass({ size: 'sm' })}>Find a driver</Link>}
          </div>

          {status === 'requested' && (
            <div className='flex flex-col items-center rounded-2xl bg-slate-50 py-5 text-center'>
              <Radar />
              <p className='mt-2 text-sm font-semibold text-slate-700'>Request sent to {driver.fullname.firstname}</p>
            </div>
          )}

          {['driver_accepted', 'driver_on_the_way', 'driver_arrived'].includes(status) && booking.startOtp && (
            <OtpDisplay label='Start OTP' otp={booking.startOtp} hint='Tell your driver this code at pickup to start the trip.' />
          )}
          {status === 'trip_started' && booking.endOtp && (
            <OtpDisplay label='End OTP' otp={booking.endOtp} hint='Tell your driver this code when the trip is over.' />
          )}

          {tracking && <p className='flex items-center gap-1.5 text-xs font-medium text-slate-500'><span className='h-2 w-2 animate-pulse rounded-full bg-brand-500' />Live · driver’s position updated {timeAgo(booking.driverLocation.updatedAt).toLowerCase()}</p>}

          <Card>
            <div className='flex items-center gap-3.5'>
              <Avatar person={driver} size='h-14 w-14' />
              <div className='min-w-0 flex-1'>
                <p className='flex items-center gap-1.5 font-bold text-slate-900'><span className='truncate'>{driver.fullname.firstname} {driver.fullname.lastname}</span><Icon name='ri-verified-badge-fill' className='text-brand-600' /></p>
                <p className='text-[13px] text-slate-500'><Stars value={driver.rating.average} count={driver.rating.count} size='text-[13px]' /> · {driver.experienceYears} yrs experience</p>
                {driver.languages?.length > 0 && <p className='text-[13px] text-slate-500'>Speaks {driver.languages.join(', ')}</p>}
              </div>
              {driver.phone && (
                <a href={`tel:${driver.phone}`} aria-label={`Call ${driver.fullname.firstname}`} className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xl text-white shadow-sm hover:bg-brand-700'>
                  <Icon name='ri-phone-fill' />
                </a>
              )}
            </div>

            {active && (
              <div className='mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4'>
                <Button variant='secondary' loading={share.isPending} onClick={() => share.mutate()}><Icon name='ri-share-forward-line' />Share trip</Button>
                <Button variant='danger-soft' onClick={() => setDialog('safety')}><Icon name='ri-alarm-warning-fill' />SOS</Button>
              </div>
            )}
          </Card>

          {status === 'trip_completed' && (
            <Note tone='amber' icon='ri-shield-keyhole-line'>
              Need help with this trip? <button type='button' onClick={() => setDialog('safety')} className='font-semibold underline underline-offset-2'>Open safety options</button>
            </Note>
          )}

          {status === 'payment_completed' && (
            <Card><RatingForm title={`Rate ${driver.fullname.firstname}`} loading={review.isPending} onSubmit={(body) => review.mutate(body)} /></Card>
          )}
          <ErrorNote>{review.error && errorMessage(review.error)}</ErrorNote>

          <Card><SectionTitle>Trip details</SectionTitle><BookingDetails booking={booking} /></Card>
        </div>

        <div className='space-y-4'>
          <Card><SectionTitle>Payment</SectionTitle><PriceBreakdown pricing={booking.pricing} paid={booking.payment?.status === 'paid'} /></Card>
          <Card><SectionTitle>Progress</SectionTitle><BookingTimeline booking={booking} /></Card>

          <div className='flex flex-col gap-2'>
            {CANCELLABLE_STATUSES.includes(status) && (
              <Button variant='danger-soft' onClick={() => { cancel.reset(); setDialog('cancel') }}>Cancel booking</Button>
            )}
            <Button variant='ghost' onClick={() => setDialog('complaint')}><Icon name='ri-flag-line' />Report an issue</Button>
            {CLOSED_STATUSES.includes(status) && <Link to='/book' className={buttonClass({ variant: 'secondary' })}>Book another driver</Link>}
          </div>
        </div>
      </div>
      </MapShell>

      <Modal open={dialog === 'cancel'} onClose={() => setDialog(null)} title='Cancel this booking?'>
        <div className='space-y-4'>
          <p className='text-sm text-slate-600'>{status === 'requested' ? 'Your request will be withdrawn.' : `${driver.fullname.firstname} has already confirmed and will be told right away.`} There is no cancellation fee.</p>
          <Field label='Reason' optional><Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder='Plans changed, booked by mistake…' className='min-h-[72px]' /></Field>
          <ErrorNote>{cancel.error && errorMessage(cancel.error)}</ErrorNote>
          <div className='flex gap-2'>
            <Button variant='secondary' className='flex-1' onClick={() => setDialog(null)}>Keep booking</Button>
            <Button variant='danger' className='flex-1' loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel booking</Button>
          </div>
        </div>
      </Modal>

      <SafetySheet open={dialog === 'safety'} onClose={() => setDialog(null)} bookingId={id} canShare={active} />
      <ComplaintDialog open={dialog === 'complaint'} onClose={() => setDialog(null)} bookingId={id} />
    </>
  )
}
