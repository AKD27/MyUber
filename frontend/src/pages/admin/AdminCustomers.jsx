import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { shortDate, fullName } from '../../lib/format'
import { toast } from '../../store/toast'
import Pagination from './Pagination'
import { Badge, Button, EmptyState, ErrorNote, Input, PageHeader, Spinner, Stars } from '../../components/ui'

export default function AdminCustomers() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-customers', query, page],
    queryFn: () => api.get('/admin/customers', { params: { search: query || undefined, page } }).then((res) => res.data),
  })

  const setStatus = useMutation({
    mutationFn: ({ id, accountStatus }) => api.patch(`/admin/customers/${id}/account-status`, { accountStatus }).then((res) => res.data),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] })
      toast(customer.accountStatus === 'suspended' ? 'Customer suspended' : 'Customer reactivated', 'success')
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  })

  return (
    <div>
      <PageHeader title='Customers' />
      <form className='mb-4 flex gap-2' onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1) }}>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search name, email or phone' className='max-w-sm' />
        <Button type='submit' variant='secondary'>Search</Button>
      </form>
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.items.length === 0 && <EmptyState title='No customers found' />}
      {data?.items.length > 0 && (
        <div className='overflow-x-auto rounded-xl border border-gray-200 bg-white'>
          <table className='w-full text-left text-sm'>
            <thead className='bg-gray-50 text-xs uppercase text-gray-500'>
              <tr><th className='px-4 py-3'>Customer</th><th className='px-4 py-3'>Phone</th><th className='px-4 py-3'>Rating</th><th className='px-4 py-3'>Joined</th><th className='px-4 py-3'>Status</th><th /></tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {data.items.map((customer) => (
                <tr key={customer._id}>
                  <td className='px-4 py-3'><p className='font-medium'>{fullName(customer)}</p><p className='text-xs text-gray-500'>{customer.email}</p></td>
                  <td className='px-4 py-3'>{customer.phone}</td>
                  <td className='px-4 py-3'><Stars value={customer.rating.average} count={customer.rating.count} /></td>
                  <td className='px-4 py-3'>{shortDate(customer.createdAt)}</td>
                  <td className='px-4 py-3'>{customer.accountStatus === 'suspended' ? <Badge tone='red'>Suspended</Badge> : <Badge tone='green'>Active</Badge>}</td>
                  <td className='px-4 py-3 text-right'>
                    <Button variant='secondary' loading={setStatus.isPending && setStatus.variables?.id === customer._id}
                      onClick={() => setStatus.mutate({ id: customer._id, accountStatus: customer.accountStatus === 'suspended' ? 'active' : 'suspended' })}>
                      {customer.accountStatus === 'suspended' ? 'Reactivate' : 'Suspend'}
                    </Button>
                  </td>
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
