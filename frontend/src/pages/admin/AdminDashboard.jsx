import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees } from '../../lib/format'
import { Card, ErrorNote, Icon, PageHeader, SectionTitle, Spinner, StatTile } from '../../components/ui'
import { cx } from '../../lib/cx'

const weekday = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })

// One number per day as bars; the tallest day fills the chart.
function BarChart({ title, days, field, format = (value) => value, color }) {
  const max = Math.max(...days.map((day) => day[field]), 1)
  const total = days.reduce((sum, day) => sum + day[field], 0)

  return (
    <Card>
      <SectionTitle action={<span className='tabular text-sm font-bold text-slate-900'>{format(total)}</span>}>{title}</SectionTitle>
      <div className='flex h-36 items-end gap-2 sm:gap-3' role='img' aria-label={`${title}: ${format(total)} in the last 7 days`}>
        {days.map((day) => (
          <div key={day.date} className='flex h-full flex-1 flex-col items-center justify-end gap-1.5'>
            <span className='tabular text-[11px] font-semibold text-slate-600'>{day[field] ? format(day[field]) : ''}</span>
            <div className={cx('w-full rounded-t-lg', color)} style={{ height: `${Math.max(2, (day[field] / max) * 100)}%` }} />
            <span className='text-[11px] font-medium text-slate-400'>{weekday(day.date)}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Attention({ to, icon, tone, count, label, zero }) {
  const active = count > 0
  return (
    <Link to={to} className={cx('flex items-center gap-3.5 rounded-2xl p-4 ring-1 ring-inset transition', active ? tone : 'bg-white ring-slate-200 hover:bg-slate-50')}>
      <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl', active ? 'bg-white/70' : 'bg-slate-100 text-slate-500')}><Icon name={icon} /></span>
      <span className='min-w-0 flex-1'>
        <span className='tabular block text-xl font-extrabold leading-tight'>{count}</span>
        <span className='block text-sm font-medium opacity-80'>{active ? label : zero}</span>
      </span>
      <Icon name='ri-arrow-right-s-line' className='text-xl opacity-50' />
    </Link>
  )
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get('/admin/stats').then((res) => res.data), refetchInterval: 30000 })

  if (isLoading) return <Spinner />
  if (error) return <ErrorNote>{errorMessage(error)}</ErrorNote>

  return (
    <div className='space-y-6'>
      <PageHeader title='Overview' subtitle='How the platform is doing right now. Refreshes every 30 seconds.' />

      <section>
        <SectionTitle>Needs attention</SectionTitle>
        <div className='grid gap-3 md:grid-cols-3'>
          <Attention to='/admin/safety' icon='ri-alarm-warning-fill' tone='bg-red-50 text-red-800 ring-red-600/20 hover:bg-red-100' count={data.openSosAlerts} label='Open SOS alerts' zero='No open SOS alerts' />
          <Attention to='/admin/drivers?status=under_review' icon='ri-shield-user-fill' tone='bg-amber-50 text-amber-900 ring-amber-600/20 hover:bg-amber-100' count={data.pendingVerifications} label='Drivers waiting for verification' zero='No drivers waiting' />
          <Attention to='/admin/complaints' icon='ri-feedback-fill' tone='bg-blue-50 text-blue-900 ring-blue-600/20 hover:bg-blue-100' count={data.openComplaints} label='Unresolved complaints' zero='No open complaints' />
        </div>
      </section>

      <section>
        <SectionTitle>Today</SectionTitle>
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
          <Link to='/admin/bookings' className='rounded-2xl'><StatTile icon='ri-file-list-3-line' tone='blue' label="Today's bookings" value={data.todaysBookings.toLocaleString('en-IN')} /></Link>
          <StatTile icon='ri-money-rupee-circle-line' tone='brand' label="Today's revenue" value={rupees(data.todaysRevenue)} hint='Platform commission' />
          <StatTile icon='ri-exchange-funds-line' label="Today's booking value" value={rupees(data.todaysBookingValue)} hint='Paid to drivers in cash' />
          <Link to='/admin/drivers?status=verified' className='rounded-2xl'><StatTile icon='ri-radar-line' tone='brand' label='Drivers online' value={data.activeDrivers.toLocaleString('en-IN')} hint='Verified and active' /></Link>
        </div>
      </section>

      <div className='grid gap-4 lg:grid-cols-2'>
        <BarChart title='Bookings · last 7 days' days={data.last7Days} field='bookings' color='bg-blue-500' />
        <BarChart title='Revenue · last 7 days' days={data.last7Days} field='revenue' format={rupees} color='bg-brand-500' />
      </div>

      <section>
        <SectionTitle>All time</SectionTitle>
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-5'>
          <Link to='/admin/customers' className='rounded-2xl'><StatTile icon='ri-group-line' label='Customers' value={data.totalCustomers.toLocaleString('en-IN')} /></Link>
          <Link to='/admin/drivers?status=all' className='rounded-2xl'><StatTile icon='ri-steering-2-line' label='Drivers' value={data.totalDrivers.toLocaleString('en-IN')} /></Link>
          <StatTile icon='ri-calendar-check-line' label='Bookings' value={data.totalBookings.toLocaleString('en-IN')} hint={`${data.completedTrips.toLocaleString('en-IN')} completed and paid`} />
          <StatTile icon='ri-exchange-funds-line' label='Booking value' value={rupees(data.totalBookingValue)} />
          <StatTile icon='ri-money-rupee-circle-line' tone='brand' label='Revenue' value={rupees(data.totalRevenue)} className='max-lg:col-span-2' />
        </div>
      </section>
    </div>
  )
}
