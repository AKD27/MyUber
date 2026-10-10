import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { BookingCard } from '../../components/BookingParts'
import { EmptyState, ErrorNote, ListSkeleton, PageHeader, Tabs } from '../../components/ui'

const TABS = [
  { value: 'requests', label: 'Requests' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'past', label: 'Past' },
]

const EMPTY = {
  requests: ['ri-notification-3-line', 'No pending requests', 'New requests appear here and on your home screen while you are online.'],
  upcoming: ['ri-calendar-line', 'No upcoming bookings', 'Bookings you accept appear here until the trip starts.'],
  active: ['ri-road-map-line', 'No trip in progress', 'A trip shows here from the moment it starts until the cash is collected.'],
  past: ['ri-history-line', 'No past bookings yet', 'Completed, cancelled and declined bookings are kept here.'],
}

export default function DriverBookings() {
  const [scope, setScope] = useState('upcoming')
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', 'driver', scope],
    queryFn: () => api.get('/bookings', { params: { scope } }).then((res) => res.data),
  })

  const [icon, title, text] = EMPTY[scope]

  return (
    <div className='mx-auto max-w-3xl'>
      <PageHeader title='Bookings' />
      <Tabs tabs={TABS} value={scope} onChange={setScope} />
      {isLoading && <ListSkeleton />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.length === 0 && <EmptyState icon={icon} title={title}>{text}</EmptyState>}
      <div className='space-y-3'>
        {data?.map((booking) => <BookingCard key={booking._id} booking={booking} to={`/driver/bookings/${booking._id}`} perspective='driver' />)}
      </div>
    </div>
  )
}
