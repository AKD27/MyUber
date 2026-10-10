import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { BookingCard } from '../../components/BookingParts'
import { buttonClass, EmptyState, ErrorNote, Icon, ListSkeleton, PageHeader, Tabs } from '../../components/ui'

const TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Ongoing' },
  { value: 'past', label: 'Past' },
]

const EMPTY = {
  upcoming: ['ri-calendar-line', 'No upcoming bookings', 'Bookings you make appear here until the trip starts.'],
  active: ['ri-road-map-line', 'No trip in progress', 'A trip shows here from the moment it starts until it is paid for.'],
  past: ['ri-history-line', 'No past bookings yet', 'Completed and cancelled bookings are kept here.'],
}

export default function MyBookings() {
  const [scope, setScope] = useState('upcoming')
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', 'customer', scope],
    queryFn: () => api.get('/bookings', { params: { scope } }).then((res) => res.data),
  })

  const bookLink = <Link to='/book' className={buttonClass({ variant: 'brand' })}><Icon name='ri-add-line' />Book a driver</Link>
  const [icon, title, text] = EMPTY[scope]

  return (
    <div className='mx-auto max-w-3xl'>
      <PageHeader title='My bookings' action={<span className='max-sm:hidden'>{bookLink}</span>} />
      <Tabs tabs={TABS} value={scope} onChange={setScope} />
      {isLoading && <ListSkeleton />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.length === 0 && <EmptyState icon={icon} title={title} action={scope !== 'active' && bookLink}>{text}</EmptyState>}
      <div className='space-y-3'>
        {data?.map((booking) => <BookingCard key={booking._id} booking={booking} to={`/bookings/${booking._id}`} perspective='customer' />)}
      </div>
    </div>
  )
}
