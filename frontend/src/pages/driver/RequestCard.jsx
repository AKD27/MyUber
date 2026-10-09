import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees, dateTime, bookingTypeLabel, durationLabel } from '../../lib/format'
import { CAR_TYPES, TRANSMISSIONS } from '../../lib/constants'
import { toast } from '../../store/toast'
import { Button, Card, Stars } from '../../components/ui'

function useCountdown(until) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const left = Math.max(0, new Date(until).getTime() - now)
  return `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`
}

// A new booking request with accept / reject.
export default function RequestCard({ booking }) {
  const queryClient = useQueryClient()
  const timeLeft = useCountdown(booking.requestExpiresAt)

  const act = useMutation({
    mutationFn: (action) => api.post(`/bookings/${booking._id}/${action}`, {}).then((res) => res.data),
    onSuccess: (updated, action) => {
      queryClient.setQueryData(['booking', updated._id], updated)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] })
      toast(action === 'accept' ? 'Booking accepted' : 'Booking declined', action === 'accept' ? 'success' : 'info')
    },
    onError: (error) => toast(errorMessage(error), 'error'),
  })

  return (
    <Card data-testid='booking-request'>
      <div className='flex items-start justify-between gap-2'>
        <div>
          <p className='font-semibold'>{bookingTypeLabel(booking)} · {durationLabel(booking.duration)}</p>
          <p className='text-sm text-gray-600'>{dateTime(booking.startTime)}</p>
        </div>
        <span className='rounded-full bg-amber-100 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800' title='Time left to respond'>{timeLeft}</span>
      </div>
      <p className='mt-2 text-sm'><i aria-hidden='true' className='ri-map-pin-user-line text-gray-400' /> {booking.pickup.address}</p>
      {booking.destination && <p className='text-sm'><i aria-hidden='true' className='ri-map-pin-2-line text-gray-400' /> {booking.destination.address}</p>}
      <p className='mt-1 text-sm text-gray-600'>{booking.customer.fullname.firstname} · <Stars value={booking.customer.rating?.average} /> · {CAR_TYPES[booking.vehicle.type]} {TRANSMISSIONS[booking.vehicle.transmission].toLowerCase()}</p>
      <p className='mt-2 text-sm'>You earn <b className='text-teal-800'>{rupees(booking.pricing.driverEarning)}</b> <span className='text-gray-500'>(customer pays {rupees(booking.pricing.driverCharges)})</span></p>
      <div className='mt-3 flex gap-2'>
        <Button variant='secondary' className='flex-1' loading={act.isPending && act.variables === 'reject'} onClick={() => act.mutate('reject')}>Reject</Button>
        <Button className='flex-1' loading={act.isPending && act.variables === 'accept'} onClick={() => act.mutate('accept')}>Accept</Button>
      </div>
      <Link to={`/driver/bookings/${booking._id}`} className='mt-2 block text-center text-xs text-teal-700 hover:underline'>View details</Link>
    </Card>
  )
}
