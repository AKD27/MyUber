import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees, shortDate, fullName } from '../../lib/format'
import { toast } from '../../store/toast'
import Avatar from '../../components/Avatar'
import Pagination, { SearchBox } from './Pagination'
import { Badge, Button, Detail, EmptyState, ErrorNote, Modal, Note, PageHeader, Spinner, Stars, StatusBadge, Table } from '../../components/ui'

const AccountBadge = ({ status }) => (status === 'suspended' ? <Badge dot tone='red'>Suspended</Badge> : <Badge dot tone='green'>Active</Badge>)

export default function AdminCustomers() {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-customers', query, page],
    queryFn: () => api.get('/admin/customers', { params: { search: query || undefined, page } }).then((res) => res.data),
  })

  return (
    <div>
      <PageHeader title='Customers' subtitle='Everyone who has signed up to hire a driver.' />
      <SearchBox onSearch={(text) => { setQuery(text); setPage(1) }} />
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.items.length === 0 && <EmptyState icon='ri-group-line' title='No customers found'>{query ? 'Nothing matches this search.' : 'Customers appear here when they sign up.'}</EmptyState>}
      {data?.items.length > 0 && (
        <Table head={['Customer', 'Phone', 'Rating', 'Joined', 'Status', '']}>
          {data.items.map((customer) => (
            <tr key={customer._id} className='hover:bg-slate-50/60'>
              <td className='px-4 py-3'>
                <div className='flex items-center gap-3'>
                  <Avatar person={customer} size='h-9 w-9' className='text-xs' />
                  <div className='min-w-0'><p className='truncate font-semibold text-slate-900'>{fullName(customer)}</p><p className='truncate text-xs text-slate-500'>{customer.email}</p></div>
                </div>
              </td>
              <td className='tabular whitespace-nowrap px-4 py-3'>{customer.phone}</td>
              <td className='px-4 py-3'><Stars value={customer.rating.average} count={customer.rating.count} /></td>
              <td className='whitespace-nowrap px-4 py-3 text-slate-500'>{shortDate(customer.createdAt)}</td>
              <td className='px-4 py-3'><AccountBadge status={customer.accountStatus} /></td>
              <td className='px-4 py-3 text-right'><Button variant='secondary' size='sm' onClick={() => setSelected(customer._id)}>View</Button></td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination data={data} page={page} onChange={setPage} />
      <CustomerDetail customerId={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function CustomerDetail({ customerId, onClose }) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-customer', customerId],
    queryFn: () => api.get(`/admin/customers/${customerId}`).then((res) => res.data),
    enabled: Boolean(customerId),
  })

  const setStatus = useMutation({
    mutationFn: (accountStatus) => api.patch(`/admin/customers/${customerId}/account-status`, { accountStatus }).then((res) => res.data),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer', customerId] })
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] })
      toast(customer.accountStatus === 'suspended' ? 'Customer suspended' : 'Customer reactivated', 'success')
    },
  })

  const customer = data?.customer
  const suspended = customer?.accountStatus === 'suspended'

  return (
    <Modal open={Boolean(customerId)} onClose={() => { setStatus.reset(); onClose() }} title='Customer details' size='lg'>
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {customer && (
        <div className='space-y-5'>
          <div className='flex flex-wrap items-center gap-4'>
            <Avatar person={customer} size='h-16 w-16' className='text-xl' />
            <div className='min-w-0 flex-1'>
              <p className='text-lg font-extrabold text-slate-900'>{fullName(customer)}</p>
              <p className='truncate text-sm text-slate-500'>{customer.email} · {customer.phone}</p>
            </div>
            <AccountBadge status={customer.accountStatus} />
          </div>

          <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {[
              ['Bookings', data.totalBookings],
              ['Paid trips', data.paidTrips],
              ['Total paid', rupees(data.totalSpent)],
              ['Rating', customer.rating.average ? customer.rating.average.toFixed(1) : 'New'],
            ].map(([label, value]) => (
              <div key={label} className='rounded-xl bg-slate-50 p-3'><p className='tabular text-lg font-extrabold text-slate-900'>{value}</p><p className='text-xs text-slate-500'>{label}</p></div>
            ))}
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <Detail label='Joined'>{shortDate(customer.createdAt)}</Detail>
            <Detail label='Emergency contact'>{customer.emergencyContact?.name && `${customer.emergencyContact.name} · ${customer.emergencyContact.phone}`}</Detail>
          </div>

          {data.complaints > 0 && <Note tone='red' icon='ri-feedback-fill'>{data.complaints} {data.complaints === 1 ? 'complaint' : 'complaints'} from drivers about this customer.</Note>}

          <div>
            <p className='mb-2 text-sm font-bold text-slate-900'>Recent bookings and payments</p>
            {data.recentBookings.length === 0 && <p className='rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500'>No bookings yet.</p>}
            {data.recentBookings.length > 0 && (
              <ul className='divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm'>
                {data.recentBookings.map((b) => (
                  <li key={b._id} className='flex items-center justify-between gap-2 px-3.5 py-2.5'>
                    <span className='min-w-0 truncate'>{shortDate(b.startTime)} · {fullName(b.driver)} · <span className='tabular'>{rupees(b.pricing.driverCharges)}</span>{b.payment?.status === 'paid' && <span className='text-emerald-700'> · paid</span>}</span>
                    <StatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ErrorNote>{setStatus.error && errorMessage(setStatus.error)}</ErrorNote>
          <div className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4'>
            <p className='text-sm text-slate-600'>{suspended ? 'This customer cannot log in or book.' : 'Suspending stops this customer from logging in or booking.'}</p>
            <Button variant={suspended ? 'brand' : 'danger-soft'} loading={setStatus.isPending} onClick={() => setStatus.mutate(suspended ? 'active' : 'suspended')}>
              {suspended ? 'Reactivate account' : 'Suspend account'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
