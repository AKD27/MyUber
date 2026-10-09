import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { STATUS } from '../../lib/constants'
import { rupees, dateTime, fullName, bookingTypeLabel, durationLabel } from '../../lib/format'
import Pagination from './Pagination'
import { EmptyState, ErrorNote, PageHeader, Select, Spinner, StatusBadge } from '../../components/ui'

export default function AdminBookings() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-bookings', status, page],
    queryFn: () => api.get('/admin/bookings', { params: { status: status || undefined, page } }).then((res) => res.data),
  })

  return (
    <div>
      <PageHeader title='Bookings' action={
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className='w-auto' aria-label='Filter by status'>
          <option value=''>All statuses</option>
          {Object.entries(STATUS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
        </Select>
      } />
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.items.length === 0 && <EmptyState title='No bookings found' />}
      {data?.items.length > 0 && (
        <div className='overflow-x-auto rounded-xl border border-gray-200 bg-white'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-gray-50 text-xs uppercase text-gray-500'>
              <tr><th className='px-4 py-3'>Booking ID</th><th className='px-4 py-3'>Customer</th><th className='px-4 py-3'>Driver</th><th className='px-4 py-3'>Pickup → Destination</th><th className='px-4 py-3'>Date</th><th className='px-4 py-3'>Duration</th><th className='px-4 py-3'>Amount</th><th className='px-4 py-3'>Status</th></tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {data.items.map((b) => (
                <tr key={b._id} className='align-top'>
                  <td className='px-4 py-3 font-mono text-xs'>{b._id.slice(-8).toUpperCase()}</td>
                  <td className='px-4 py-3'>{fullName(b.customer)}<p className='text-xs text-gray-500'>{b.customer?.phone}</p></td>
                  <td className='px-4 py-3'>{fullName(b.driver)}<p className='text-xs text-gray-500'>{b.driver?.phone}</p></td>
                  <td className='max-w-xs px-4 py-3'><p className='truncate'>{b.pickup.address}</p>{b.destination && <p className='truncate text-gray-500'>→ {b.destination.address}</p>}</td>
                  <td className='whitespace-nowrap px-4 py-3'>{dateTime(b.startTime)}</td>
                  <td className='px-4 py-3'>{bookingTypeLabel(b)}<p className='text-xs text-gray-500'>{durationLabel(b.duration)}</p></td>
                  <td className='px-4 py-3'>{rupees(b.pricing.driverCharges)}<p className='text-xs text-gray-500'>fee {rupees(b.pricing.platformCommission)}</p></td>
                  <td className='px-4 py-3'><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination data={data} page={page} onChange={setPage} />
    </div>
  )
}
