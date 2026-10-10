import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees } from '../../lib/format'
import { useAuth } from '../../store/auth'
import { toast } from '../../store/toast'
import RequestCard from './RequestCard'
import { Radar } from '../../components/Motion'
import MapView from '../../components/MapView'
import MapShell from '../../components/MapShell'
import { BookingCard } from '../../components/BookingParts'
import { buttonClass, EmptyState, ErrorNote, Icon, Note, SectionTitle, Spinner, Stars, StatTile, Toggle } from '../../components/ui'
import { cx } from '../../lib/cx'

const bookings = (scope) => () => api.get('/bookings', { params: { scope } }).then((res) => res.data)

const VERIFICATION_NOTES = {
  pending: { tone: 'amber', icon: 'ri-file-list-3-line', text: 'Complete your profile and submit it for verification to start receiving bookings.', action: 'Complete profile' },
  under_review: { tone: 'blue', icon: 'ri-time-line', text: 'Your profile is under review. You can go online as soon as our team verifies it.' },
  rejected: { tone: 'red', icon: 'ri-error-warning-fill', text: 'Your verification was not approved. Update your profile and submit it again.', action: 'Update profile' },
}

export default function DriverDashboard() {
  const queryClient = useQueryClient()
  const { account, setAccount } = useAuth()

  const dashboard = useQuery({ queryKey: ['driver-dashboard'], queryFn: () => api.get('/drivers/me/dashboard').then((res) => res.data) })
  const requests = useQuery({ queryKey: ['bookings', 'driver', 'requests'], queryFn: bookings('requests'), refetchInterval: 30 * 1000 })
  const active = useQuery({ queryKey: ['bookings', 'driver', 'active'], queryFn: bookings('active') })
  const upcoming = useQuery({ queryKey: ['bookings', 'driver', 'upcoming'], queryFn: bookings('upcoming') })

  const availability = useMutation({
    mutationFn: (isOnline) => api.patch('/drivers/me/availability', { isOnline }).then((res) => res.data),
    onSuccess: ({ isOnline }) => {
      setAccount({ ...account, isOnline })
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] })
      toast(isOnline ? 'You are online and can receive bookings' : 'You are offline', isOnline ? 'success' : 'info')
    },
    onError: (error) => toast(errorMessage(error), 'error'),
  })

  if (dashboard.isLoading) return <Spinner />
  if (dashboard.error) return <ErrorNote>{errorMessage(dashboard.error)}</ErrorNote>

  const d = dashboard.data
  const verified = d.verificationStatus === 'verified'
  const note = VERIFICATION_NOTES[d.verificationStatus]
  const online = account.isOnline
  const current = [...(active.data || []), ...(upcoming.data || [])]

  // The map shows where customers will find this driver: their live or base position.
  const position = account.location?.coordinates
  const here = position ? { lat: position[1], lng: position[0], label: 'You', kind: 'driver' } : null

  return (
    <MapShell map={<MapView fill center={{ lat: 28.6139, lng: 77.209 }} points={[here]} />}>
    <div className='space-y-5'>
      <div className={cx('relative overflow-hidden rounded-3xl p-5 text-white shadow-card transition-colors sm:p-7', online ? 'bg-emerald-700' : 'bg-slate-900')}>
        <div aria-hidden='true' className={cx('absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl', online ? 'bg-emerald-400/40' : 'bg-slate-600/40')} />
        <div className='relative flex flex-wrap items-center justify-between gap-4'>
          <div>
            <p className='text-sm font-medium text-white/70'>Welcome back,</p>
            <h1 className='text-2xl font-extrabold tracking-tight sm:text-3xl'>{account.fullname.firstname}</h1>
            <p className='mt-2 flex items-center gap-2 text-sm font-semibold'>
              <span className={cx('h-2.5 w-2.5 rounded-full', online ? 'animate-pulse bg-emerald-300' : 'bg-slate-500')} />
              {online ? 'You are online — new requests will appear below' : verified ? 'You are offline — go online to receive requests' : 'You can go online once you are verified'}
            </p>
          </div>
          <div className='flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/10'>
            <span className='text-sm font-bold'>{online ? 'Online' : 'Offline'}</span>
            <Toggle checked={online} label='Online' disabled={!verified || availability.isPending} onChange={(value) => availability.mutate(value)} />
          </div>
        </div>
      </div>

      {note && (
        <Note tone={note.tone} icon={note.icon}>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <span>{note.text}</span>
            {note.action && <Link to='/driver/profile' className={buttonClass({ size: 'sm' })}>{note.action}</Link>}
          </div>
        </Note>
      )}

      <div className='stagger grid grid-cols-2 gap-3'>
        <Link to='/driver/earnings' className='rounded-2xl'><StatTile icon='ri-wallet-3-line' tone='brand' label="Today's earnings" value={rupees(d.todayEarnings)} hint={`${d.todayTrips} ${d.todayTrips === 1 ? 'trip' : 'trips'} today`} /></Link>
        <Link to='/driver/bookings' className='rounded-2xl'><StatTile icon='ri-calendar-check-line' tone='blue' label='Upcoming' value={d.upcomingBookings} hint={d.activeBookings ? `${d.activeBookings} in progress` : 'Confirmed bookings'} /></Link>
        <Link to='/driver/earnings' className='rounded-2xl'><StatTile icon='ri-line-chart-line' label='Total earnings' value={rupees(d.totalEarnings)} hint={`${d.completedTrips} completed trips`} /></Link>
        <Link to='/driver/earnings' className='rounded-2xl'><StatTile icon='ri-star-line' tone='amber' label='Rating' value={<Stars value={d.rating.average} size='text-2xl' />} hint={d.rating.count ? `${d.rating.count} ${d.rating.count === 1 ? 'review' : 'reviews'}` : 'No reviews yet'} /></Link>
      </div>

      <section>
        <SectionTitle>New requests {requests.data?.length > 0 && <span className='ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white'>{requests.data.length}</span>}</SectionTitle>
        <ErrorNote>{requests.error && errorMessage(requests.error)}</ErrorNote>
        {requests.data?.length === 0 && (
          <EmptyState visual={online && <Radar className='mb-2' />} icon='ri-moon-clear-line' title={online ? 'Looking for requests…' : 'No new requests'}>
            {online ? 'Keep this page open. New booking requests appear here instantly.' : 'Go online to receive booking requests from customers near you.'}
          </EmptyState>
        )}
        <div className='grid grid-cols-1 gap-4'>
          {requests.data?.map((booking) => <RequestCard key={booking._id} booking={booking} />)}
        </div>
      </section>

      {current.length > 0 && (
        <section>
          <SectionTitle action={<Link to='/driver/bookings' className='text-sm font-semibold text-brand-700 hover:underline'>See all</Link>}>Your bookings</SectionTitle>
          <div className='grid grid-cols-1 gap-3'>
            {current.slice(0, 4).map((booking) => <BookingCard key={booking._id} booking={booking} to={`/driver/bookings/${booking._id}`} perspective='driver' />)}
          </div>
        </section>
      )}

      {!online && verified && current.length === 0 && (
        <p className='flex items-center justify-center gap-2 text-sm text-slate-500'><Icon name='ri-lightbulb-line' />Tip: set your working hours in your profile so you are only offered bookings that suit you.</p>
      )}
    </div>
    </MapShell>
  )
}
