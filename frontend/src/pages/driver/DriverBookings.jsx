import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees, dateTime, bookingTypeLabel, durationLabel } from '../../lib/format'
import { Card, EmptyState, ErrorNote, PageHeader, Spinner, StatusBadge, Tabs } from '../../components/ui'

const TABS = [
  { value: 'requests', label: 'Requests' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'past', label: 'Completed & past' },
]

export default function DriverBookings() {
  const [scope, setScope] = useState('upcoming')
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', 'driver', scope],
    queryFn: () => api.get('/bookings', { params: { scope } }).then((res) => res.data),
  })

  return (
    <div>
      <PageHeader title='Bookings' />
      <Tabs tabs={TABS} value={scope} onChange={setScope} />
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.length === 0 && <EmptyState title='Nothing here yet' />}
      <div className='space-y-3'>
        {data?.map((booking) => (
          <Link key={booking._id} to={`/driver/bookings/${booking._id}`} className='block'>
            <Card className='hover:border-teal-600'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div>
                  <p className='font-semibold'>{bookingTypeLabel(booking)} · {durationLabel(booking.duration)}</p>
                  <p className='text-sm text-gray-600'>{dateTime(booking.startTime)} · {booking.customer.fullname.firstname}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
              <p className='mt-2 truncate text-sm text-gray-700'><i aria-hidden='true' className='ri-map-pin-user-line text-gray-400' /> {booking.pickup.address}</p>
              <p className='mt-1 text-right text-sm'>You earn <b>{rupees(booking.pricing.driverEarning)}</b></p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
