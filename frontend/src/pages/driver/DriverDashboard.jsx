import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees } from '../../lib/format'
import { useAuth } from '../../store/auth'
import { toast } from '../../store/toast'
import RequestCard from './RequestCard'
import { Card, EmptyState, ErrorNote, PageHeader, Spinner, Stars } from '../../components/ui'
import { cx } from '../../lib/cx'

export default function DriverDashboard() {
  const queryClient = useQueryClient()
  const { account, setAccount } = useAuth()

  const dashboard = useQuery({ queryKey: ['driver-dashboard'], queryFn: () => api.get('/drivers/me/dashboard').then((res) => res.data) })
  const requests = useQuery({ queryKey: ['bookings', 'driver', 'requests'], queryFn: () => api.get('/bookings', { params: { scope: 'requests' } }).then((res) => res.data) })

  const availability = useMutation({
    mutationFn: (isOnline) => api.patch('/drivers/me/availability', { isOnline }).then((res) => res.data),
    onSuccess: ({ isOnline }) => {
      setAccount({ ...account, isOnline })
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] })
      toast(isOnline ? 'You are online and can receive bookings' : 'You are offline')
    },
    onError: (error) => toast(errorMessage(error), 'error'),
  })

  if (dashboard.isLoading) return <Spinner />
  if (dashboard.error) return <ErrorNote>{errorMessage(dashboard.error)}</ErrorNote>

  const d = dashboard.data
  const verified = d.verificationStatus === 'verified'

  return (
    <div className='space-y-6'>
      <PageHeader title={`Welcome, ${account.fullname.firstname}`} subtitle='Your driver dashboard' />

      {!verified && (
        <Card className='border-amber-200 bg-amber-50 text-sm text-amber-900'>
          {d.verificationStatus === 'under_review'
            ? 'Your profile is under review. You can go online once an admin verifies it.'
            : d.verificationStatus === 'rejected'
              ? <>Your verification was rejected. <Link to='/driver/profile' className='font-semibold underline'>Update your profile</Link> and submit again.</>
              : <>Complete your profile and submit it for verification to start receiving bookings. <Link to='/driver/profile' className='font-semibold underline'>Complete profile</Link></>}
        </Card>
      )}

      <Card className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-sm text-gray-500'>Availability</p>
          <p className={cx('text-xl font-bold', account.isOnline ? 'text-green-700' : 'text-gray-500')}>{account.isOnline ? 'ONLINE' : 'OFFLINE'}</p>
        </div>
        <button type='button' role='switch' aria-checked={account.isOnline} aria-label='Online' disabled={!verified || availability.isPending}
          onClick={() => availability.mutate(!account.isOnline)}
          className={cx('relative h-8 w-14 rounded-full transition disabled:opacity-40', account.isOnline ? 'bg-green-600' : 'bg-gray-300')}>
          <span className={cx('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition', account.isOnline ? 'left-7' : 'left-1')} />
        </button>
      </Card>

      <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
        <Stat label="Today's earnings" value={rupees(d.todayEarnings)} />
        <Stat label="Today's trips" value={d.todayTrips} />
        <Stat label='Upcoming bookings' value={d.upcomingBookings} link='/driver/bookings' />
        <Stat label='Rating' value={<Stars value={d.rating.average} count={d.rating.count} size='text-xl' />} />
        <Stat label='Total earnings' value={rupees(d.totalEarnings)} />
        <Stat label='Completed trips' value={d.completedTrips} />
        <Stat label='Ongoing' value={d.activeBookings} link='/driver/bookings' />
        <Stat label='New requests' value={d.pendingRequests} />
      </div>

      <section>
        <h2 className='mb-3 text-lg font-semibold'>Booking requests</h2>
        {requests.isLoading && <Spinner />}
        {requests.data?.length === 0 && (
          <EmptyState icon='ri-notification-3-line' title='No new requests'>{account.isOnline ? 'New booking requests appear here instantly.' : 'Go online to receive booking requests.'}</EmptyState>
        )}
        <div className='grid gap-3 md:grid-cols-2'>
          {requests.data?.map((booking) => <RequestCard key={booking._id} booking={booking} />)}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, link }) {
  const body = (
    <Card className={cx('h-full', link && 'hover:border-teal-600')}>
      <p className='text-xs text-gray-500'>{label}</p>
      <p className='mt-1 text-xl font-bold'>{value}</p>
    </Card>
  )
  return link ? <Link to={link}>{body}</Link> : body
}
