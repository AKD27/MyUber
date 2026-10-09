import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees } from '../../lib/format'
import { toast } from '../../store/toast'
import Avatar from '../../components/Avatar'
import MapView from '../../components/MapView'
import { placePoint } from '../../lib/places'
import { BookingDetails, BookingTimeline, OtpDisplay, PriceBreakdown, RatingForm } from '../../components/BookingParts'
import { Button, Card, ErrorNote, Field, Input, Modal, Spinner, Stars, StatusBadge } from '../../components/ui'

const CANCELLABLE = ['requested', 'driver_accepted', 'driver_on_the_way', 'driver_arrived']
const START_OTP_STATUSES = ['driver_accepted', 'driver_on_the_way', 'driver_arrived']

export default function CustomerBookingDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then((res) => res.data),
  })

  const onUpdated = (updated) => {
    queryClient.setQueryData(['booking', id], updated)
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  const cancel = useMutation({
    mutationFn: () => api.post(`/bookings/${id}/cancel`, { reason: reason || undefined }).then((res) => res.data),
    onSuccess: (updated) => { onUpdated(updated); setCancelOpen(false); toast('Booking cancelled') },
  })

  const review = useMutation({
    mutationFn: (body) => api.post(`/bookings/${id}/review`, body).then((res) => res.data),
    onSuccess: (updated) => { onUpdated(updated); toast('Thanks for rating your driver!', 'success') },
  })

  if (isLoading) return <Spinner />
  if (error) return <ErrorNote>{errorMessage(error)}</ErrorNote>

  const { driver } = booking
  const points = [placePoint(booking.pickup, 'Pickup', 'pickup'), placePoint(booking.destination, 'Destination', 'destination')].filter(Boolean)

  return (
    <div className='grid gap-6 lg:grid-cols-[1fr_360px]'>
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h1 className='text-2xl font-bold'>Your booking</h1>
          <StatusBadge status={booking.status} />
        </div>

        {START_OTP_STATUSES.includes(booking.status) && booking.startOtp && (
          <OtpDisplay label='Start OTP' otp={booking.startOtp} hint='Share this with your driver at pickup to start the trip.' />
        )}
        {booking.status === 'trip_started' && booking.endOtp && (
          <OtpDisplay label='End OTP' otp={booking.endOtp} hint='Share this with your driver when the trip is over.' />
        )}
        {booking.status === 'requested' && (
          <Card className='border-amber-200 bg-amber-50 text-sm text-amber-900'>
            Waiting for {driver.fullname.firstname} to confirm. You will be notified here as soon as they respond.
          </Card>
        )}
        {['driver_rejected', 'expired'].includes(booking.status) && (
          <Card className='text-sm'>
            {driver.fullname.firstname} is not available for this booking. <Link to='/book' className='font-semibold text-teal-700 hover:underline'>Choose another driver</Link>
          </Card>
        )}
        {booking.status === 'trip_completed' && (
          <Card className='border-blue-200 bg-blue-50 text-sm text-blue-900'>
            Trip completed. Please pay <b>{rupees(booking.pricing.driverCharges)}</b> in cash to your driver.
          </Card>
        )}

        <Card>
          <div className='flex items-center gap-3'>
            <Avatar person={driver} />
            <div className='flex-1'>
              <p className='font-semibold'>{driver.fullname.firstname} {driver.fullname.lastname}</p>
              <p className='text-sm text-gray-600'><Stars value={driver.rating.average} count={driver.rating.count} /> · {driver.experienceYears} yrs experience</p>
            </div>
            {driver.phone && (
              <a href={`tel:${driver.phone}`} className='flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white'>
                <i aria-hidden='true' className='ri-phone-line' /> Call
              </a>
            )}
          </div>
        </Card>

        {points.length > 0 && <MapView points={points} />}

        <Card><BookingDetails booking={booking} /></Card>

        {booking.status === 'payment_completed' && (
          <Card><RatingForm title={`How was your trip with ${driver.fullname.firstname}?`} loading={review.isPending} onSubmit={(body) => review.mutate(body)} /></Card>
        )}
        <ErrorNote>{review.error && errorMessage(review.error)}</ErrorNote>
      </div>

      <div className='space-y-4'>
        <Card><h2 className='mb-3 font-semibold'>Progress</h2><BookingTimeline booking={booking} /></Card>
        <Card><h2 className='mb-3 font-semibold'>Payment</h2><PriceBreakdown pricing={booking.pricing} /></Card>
        {CANCELLABLE.includes(booking.status) && (
          <Button variant='secondary' className='w-full text-red-600' onClick={() => setCancelOpen(true)}>Cancel booking</Button>
        )}
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title='Cancel this booking?'>
        <div className='space-y-4'>
          <Field label='Reason (optional)'><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></Field>
          <ErrorNote>{cancel.error && errorMessage(cancel.error)}</ErrorNote>
          <div className='flex gap-2'>
            <Button variant='secondary' className='flex-1' onClick={() => setCancelOpen(false)}>Keep booking</Button>
            <Button variant='danger' className='flex-1' loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel booking</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
