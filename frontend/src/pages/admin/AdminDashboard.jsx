import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees } from '../../lib/format'
import { Card, ErrorNote, PageHeader, Spinner } from '../../components/ui'

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get('/admin/stats').then((res) => res.data), refetchInterval: 30000 })

  if (isLoading) return <Spinner />
  if (error) return <ErrorNote>{errorMessage(error)}</ErrorNote>

  const stats = [
    ['Total customers', data.totalCustomers, '/admin/customers'],
    ['Total drivers', data.totalDrivers, '/admin/drivers?status=all'],
    ['Active drivers (online)', data.activeDrivers, '/admin/drivers?status=verified'],
    ['Pending verifications', data.pendingVerifications, '/admin/drivers?status=under_review'],
    ["Today's bookings", data.todaysBookings, '/admin/bookings'],
    ["Today's booking value", rupees(data.todaysBookingValue)],
    ["Today's revenue (commission)", rupees(data.todaysRevenue)],
  ]

  return (
    <div>
      <PageHeader title='Admin dashboard' subtitle='Platform overview, refreshed every 30 seconds.' />
      <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
        {stats.map(([label, value, link]) => {
          const card = (
            <Card className={link ? 'h-full hover:border-teal-600' : 'h-full'}>
              <p className='text-xs text-gray-500'>{label}</p>
              <p className='mt-1 text-2xl font-bold'>{value}</p>
            </Card>
          )
          return link ? <Link key={label} to={link}>{card}</Link> : <div key={label}>{card}</div>
        })}
      </div>
    </div>
  )
}
