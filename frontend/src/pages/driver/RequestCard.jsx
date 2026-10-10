import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees, durationLabel, bookingTypeLabel, friendlyDateTime } from '../../lib/format'
import { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS } from '../../lib/constants'
import { toast } from '../../store/toast'
import { RouteLine } from '../../components/BookingParts'
import { CountdownRing } from '../../components/Motion'
import { Button, Icon, Stars } from '../../components/ui'
import { cx } from '../../lib/cx'

// Seconds left until `until`, ticking once a second.
function useCountdown(until) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return Math.max(0, Math.ceil((new Date(until).getTime() - now) / 1000))
}

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

// A new booking request with accept / reject and the time left to answer.
export default function RequestCard({ booking }) {
  const queryClient = useQueryClient()
  const secondsLeft = useCountdown(booking.requestExpiresAt)
  const urgent = secondsLeft <= 60

  const act = useMutation({
    mutationFn: (action) => api.post(`/bookings/${booking._id}/${action}`, {}).then((res) => res.data),
    onSuccess: (updated, action) => {
      queryClient.setQueryData(['booking', updated._id], updated)
      toast(action === 'accept' ? 'Booking accepted' : 'Request declined', action === 'accept' ? 'success' : 'info')
    },
    onError: (error) => toast(errorMessage(error), 'error'),
    // Also after an error: the request may have expired or been cancelled in the meantime.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] })
    },
  })

  return (
    <div data-testid='booking-request' className='animate-slide-up overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lift'>
      <div className={cx('flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-bold text-white', urgent ? 'bg-red-600' : 'bg-slate-900')}>
        <span className='flex items-center gap-2'><Icon name='ri-notification-3-fill' className={cx('origin-top animate-bounce', !urgent && 'text-brand-400')} />New request</span>
        <span className='tabular flex items-center gap-1.5' title='Time left to respond'><CountdownRing fraction={secondsLeft / 300} />{clock(secondsLeft)}</span>
      </div>

      <div className='p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-700'><Icon name={BOOKING_TYPES[booking.bookingType]?.icon} /></span>
            <div className='min-w-0'>
              <p className='truncate font-bold text-slate-900'>{bookingTypeLabel(booking)} · {durationLabel(booking.duration)}</p>
              <p className='text-[13px] text-slate-500'>{friendlyDateTime(booking.startTime)}</p>
            </div>
          </div>
          <div className='text-right'>
            <p className='tabular text-xl font-extrabold tracking-tight text-brand-700'>{rupees(booking.pricing.driverEarning)}</p>
            <p className='text-[11px] text-slate-500'>you earn</p>
          </div>
        </div>

        <div className='mt-4'><RouteLine pickup={booking.pickup} destination={booking.destination} compact /></div>

        <p className='mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-3 text-[13px] text-slate-600'>
          <span className='font-semibold text-slate-900'>{booking.customer.fullname.firstname}</span>
          <Stars value={booking.customer.rating?.average} size='text-[13px]' />
          <span className='text-slate-300'>·</span>
          <span>{booking.vehicle.model || CAR_TYPES[booking.vehicle.type]} ({TRANSMISSIONS[booking.vehicle.transmission].toLowerCase()})</span>
          <span className='text-slate-300'>·</span>
          <span>Collect {rupees(booking.pricing.driverCharges)} cash</span>
        </p>

        <div className='mt-4 flex gap-2'>
          <Button variant='secondary' className='flex-1' disabled={act.isPending} loading={act.isPending && act.variables === 'reject'} onClick={() => act.mutate('reject')}>Decline</Button>
          <Button variant='brand' className='flex-[2]' disabled={act.isPending || secondsLeft === 0} loading={act.isPending && act.variables === 'accept'} onClick={() => act.mutate('accept')}>Accept</Button>
        </div>
        <Link to={`/driver/bookings/${booking._id}`} className='mt-3 block text-center text-[13px] font-semibold text-slate-500 hover:text-slate-900'>View full details</Link>
      </div>
    </div>
  )
}
