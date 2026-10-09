import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees, dateTime, bookingTypeLabel, durationLabel } from '../../lib/format'
import { Card, EmptyState, ErrorNote, PageHeader, Spinner, StatusBadge, Tabs } from '../../components/ui'

const TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Ongoing' },
  { value: 'past', label: 'Past' },
]

export default function MyBookings() {
  const [scope, setScope] = useState('upcoming')
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', 'customer', scope],
    queryFn: () => api.get('/bookings', { params: { scope } }).then((res) => res.data),
  })

  return (
    <div>
      <PageHeader title='My bookings' action={<Link to='/book' className='rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800'>Book a driver</Link>} />
      <Tabs tabs={TABS} value={scope} onChange={setScope} />
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.length === 0 && <EmptyState title='No bookings here yet' />}
      <div className='space-y-3'>
        {data?.map((booking) => (
          <Link key={booking._id} to={`/bookings/${booking._id}`} className='block'>
            <Card className='hover:border-teal-600'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div>
                  <p className='font-semibold'>{bookingTypeLabel(booking)} · {durationLabel(booking.duration)}</p>
                  <p className='text-sm text-gray-600'>{dateTime(booking.startTime)}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
              <p className='mt-2 truncate text-sm text-gray-700'><i aria-hidden='true' className='ri-map-pin-user-line text-gray-400' /> {booking.pickup.address}</p>
              <div className='mt-2 flex justify-between text-sm'>
                <span className='text-gray-600'>Driver: {booking.driver.fullname.firstname}</span>
                <span className='font-semibold'>{rupees(booking.pricing.driverCharges)}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
