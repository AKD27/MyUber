import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees } from '../../lib/format'
import { toast } from '../../store/toast'
import Avatar from '../../components/Avatar'
import MapView from '../../components/MapView'
import { placePoint } from '../../lib/places'
import { BookingDetails, BookingTimeline, PriceBreakdown, RatingForm } from '../../components/BookingParts'
import { Button, Card, ErrorNote, Field, Input, Modal, Spinner, Stars, StatusBadge } from '../../components/ui'

const BEFORE_START = ['driver_accepted', 'driver_on_the_way', 'driver_arrived']

export default function DriverBookingDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [otp, setOtp] = useState('')
  const [dialog, setDialog] = useState(null) // 'reject' | 'cancel'
  const [reason, setReason] = useState('')

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then((res) => res.data),
  })

  const action = useMutation({
    mutationFn: ({ path, body }) => api.post(`/bookings/${id}/${path}`, body || {}).then((res) => res.data),
    onSuccess: (updated, { success }) => {
      queryClient.setQueryData(['booking', id], updated)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] })
      setOtp('')
      setDialog(null)
      setReason('')
      if (success) toast(success, 'success')
    },
  })

  const run = (path, success, body) => action.mutate({ path, body, success })

  if (isLoading) return <Spinner />
  if (error) return <ErrorNote>{errorMessage(error)}</ErrorNote>

  const { customer, status } = booking
  const points = [placePoint(booking.pickup, 'Pickup', 'pickup'), placePoint(booking.destination, 'Destination', 'destination')].filter(Boolean)
  const busy = action.isPending

  return (
    <div className='grid gap-6 lg:grid-cols-[1fr_360px]'>
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h1 className='text-2xl font-bold'>Booking</h1>
          <StatusBadge status={status} />
        </div>

        <Card>
          <div className='flex items-center gap-3'>
            <Avatar person={customer} />
            <div className='flex-1'>
              <p className='font-semibold'>{customer.fullname.firstname} {customer.fullname.lastname}</p>
              <p className='text-sm text-gray-600'>Customer · <Stars value={customer.rating?.average} count={customer.rating?.count} /></p>
            </div>
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className='flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white'><i aria-hidden='true' className='ri-phone-line' /> Call</a>
            )}
          </div>
        </Card>

        <Card className='space-y-3'>
          <h2 className='font-semibold'>Next step</h2>
          <ErrorNote>{action.error && errorMessage(action.error)}</ErrorNote>

          {status === 'requested' && (
            <div className='flex gap-2'>
              <Button variant='secondary' className='flex-1' onClick={() => setDialog('reject')}>Reject</Button>
              <Button className='flex-1' loading={busy} onClick={() => run('accept', 'Booking accepted')}>Accept booking</Button>
            </div>
          )}

          {status === 'driver_accepted' && <Button className='w-full' loading={busy} onClick={() => run('on-the-way')}><i aria-hidden='true' className='ri-navigation-line' /> I&apos;m on the way</Button>}
          {status === 'driver_on_the_way' && <Button className='w-full' loading={busy} onClick={() => run('arrived')}><i aria-hidden='true' className='ri-map-pin-user-line' /> I&apos;ve arrived at pickup</Button>}

          {BEFORE_START.includes(status) && (
            <form className='flex gap-2' onSubmit={(e) => { e.preventDefault(); run('start', 'Trip started', { otp }) }}>
              <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode='numeric' placeholder='Start OTP from customer' aria-label='Start OTP' className='font-mono tracking-widest' />
              <Button type='submit' variant='dark' disabled={otp.length !== 4} loading={busy}>Start trip</Button>
            </form>
          )}

          {status === 'trip_started' && (
            <form className='flex gap-2' onSubmit={(e) => { e.preventDefault(); run('complete', 'Trip completed', { otp }) }}>
              <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode='numeric' placeholder='End OTP from customer' aria-label='End OTP' className='font-mono tracking-widest' />
              <Button type='submit' variant='dark' disabled={otp.length !== 4} loading={busy}>End trip</Button>
            </form>
          )}

          {status === 'trip_completed' && (
            <Button className='w-full' loading={busy} onClick={() => run('payment-received', 'Payment recorded')}>
              <i aria-hidden='true' className='ri-money-rupee-circle-line' /> Cash received: {rupees(booking.pricing.driverCharges)}
            </Button>
          )}

          {['payment_completed', 'rating_completed'].includes(status) && !booking.driverReview && (
            <RatingForm title={`Rate ${customer.fullname.firstname}`} loading={busy} onSubmit={(body) => run('review-customer', 'Thanks for your rating', body)} />
          )}
          {['payment_completed', 'rating_completed'].includes(status) && booking.driverReview && <p className='text-sm text-gray-600'>This booking is complete. Thank you!</p>}
          {['cancelled', 'driver_rejected', 'expired'].includes(status) && <p className='text-sm text-gray-600'>This booking is closed.</p>}

          {BEFORE_START.includes(status) && (
            <button type='button' onClick={() => setDialog('cancel')} className='text-sm text-red-600 hover:underline'>Cancel this booking</button>
          )}
        </Card>

        {points.length > 0 && <MapView points={points} />}
        <Card><BookingDetails booking={booking} /></Card>
      </div>

      <div className='space-y-4'>
        <Card><h2 className='mb-3 font-semibold'>Progress</h2><BookingTimeline booking={booking} /></Card>
        <Card><h2 className='mb-3 font-semibold'>Earnings</h2><PriceBreakdown pricing={booking.pricing} perspective='driver' /></Card>
      </div>

      <Modal open={Boolean(dialog)} onClose={() => setDialog(null)} title={dialog === 'reject' ? 'Reject this request?' : 'Cancel this booking?'}>
        <div className='space-y-4'>
          {dialog === 'cancel' && <p className='text-sm text-gray-600'>Cancelling after accepting affects your cancellation rate, which customers can see.</p>}
          <Field label='Reason'><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder='Let the customer know why' /></Field>
          <ErrorNote>{action.error && errorMessage(action.error)}</ErrorNote>
          <Button variant='danger' className='w-full' loading={busy}
            onClick={() => run(dialog === 'reject' ? 'reject' : 'driver-cancel', dialog === 'reject' ? 'Request rejected' : 'Booking cancelled', { reason: reason || undefined })}>
            {dialog === 'reject' ? 'Reject request' : 'Cancel booking'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
