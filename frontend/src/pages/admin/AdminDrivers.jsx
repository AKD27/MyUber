import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS } from '../../lib/constants'
import { rupees, shortDate, fullName } from '../../lib/format'
import { toast } from '../../store/toast'
import Pagination from './Pagination'
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Modal, PageHeader, Spinner, Stars, StatusBadge, Tabs, VerificationBadge } from '../../components/ui'

const TABS = [
  { value: 'under_review', label: 'Waiting for review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'pending', label: 'Incomplete' },
  { value: 'all', label: 'All' },
]

export default function AdminDrivers() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'under_review'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-drivers', status, query, page],
    queryFn: () => api.get('/admin/drivers', { params: { verificationStatus: status === 'all' ? undefined : status, search: query || undefined, page } }).then((res) => res.data),
  })

  return (
    <div>
      <PageHeader title='Drivers' subtitle='Verify new drivers and manage existing ones.' />
      <Tabs tabs={TABS} value={status} onChange={(value) => { setParams({ status: value }); setPage(1) }} />
      <form className='mb-4 flex gap-2' onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1) }}>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search name, email or phone' className='max-w-sm' />
        <Button type='submit' variant='secondary'>Search</Button>
      </form>
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.items.length === 0 && <EmptyState title='No drivers here' />}
      <div className='overflow-x-auto rounded-xl border border-gray-200 bg-white'>
        {data?.items.length > 0 && (
          <table className='w-full text-left text-sm'>
            <thead className='bg-gray-50 text-xs uppercase text-gray-500'>
              <tr><th className='px-4 py-3'>Driver</th><th className='px-4 py-3'>Phone</th><th className='px-4 py-3'>Status</th><th className='px-4 py-3'>Rating</th><th className='px-4 py-3'>Trips</th><th className='px-4 py-3'>Joined</th><th /></tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {data.items.map((driver) => (
                <tr key={driver._id}>
                  <td className='px-4 py-3'><p className='font-medium'>{fullName(driver)}</p><p className='text-xs text-gray-500'>{driver.email}</p></td>
                  <td className='px-4 py-3'>{driver.phone}</td>
                  <td className='px-4 py-3'><div className='flex flex-wrap gap-1'><VerificationBadge status={driver.verification.status} />{driver.accountStatus === 'suspended' && <Badge tone='red'>Suspended</Badge>}{driver.isOnline && <Badge tone='green'>Online</Badge>}</div></td>
                  <td className='px-4 py-3'><Stars value={driver.rating.average} count={driver.rating.count} /></td>
                  <td className='px-4 py-3'>{driver.stats.completedTrips}</td>
                  <td className='px-4 py-3'>{shortDate(driver.createdAt)}</td>
                  <td className='px-4 py-3 text-right'><Button variant='secondary' onClick={() => setSelected(driver._id)}>Review</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination data={data} page={page} onChange={setPage} />
      <DriverReview driverId={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function Detail({ label, children }) {
  return <div><p className='text-xs text-gray-500'>{label}</p><div className='text-sm'>{children || <span className='text-gray-400'>Not provided</span>}</div></div>
}

function DriverReview({ driverId, onClose }) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-driver', driverId],
    queryFn: () => api.get(`/admin/drivers/${driverId}`).then((res) => res.data),
    enabled: Boolean(driverId),
  })

  const update = useMutation({
    mutationFn: ({ path, body }) => api.patch(`/admin/drivers/${driverId}/${path}`, body).then((res) => res.data),
    onSuccess: (_, { message }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver', driverId] })
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setNote('')
      toast(message, 'success')
    },
  })

  const driver = data?.driver

  return (
    <Modal open={Boolean(driverId)} onClose={onClose} title='Driver details'>
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {driver && (
        <div className='space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div><p className='text-lg font-bold'>{fullName(driver)}</p><p className='text-sm text-gray-500'>{driver.email} · {driver.phone}</p></div>
            <VerificationBadge status={driver.verification.status} />
          </div>
          {data.missingFields.length > 0 && <p className='rounded-lg bg-amber-50 p-3 text-sm text-amber-900'>Missing: {data.missingFields.join(', ')}</p>}

          <div className='grid grid-cols-2 gap-3'>
            <Detail label='Experience'>{driver.experienceYears} years</Detail>
            <Detail label='Languages'>{driver.languages.join(', ')}</Detail>
            <Detail label='Licence'>{driver.licence?.number && `${driver.licence.number} · valid till ${shortDate(driver.licence.expiry)}`}</Detail>
            <Detail label='Emergency contact'>{driver.emergencyContact?.name && `${driver.emergencyContact.name} · ${driver.emergencyContact.phone}`}</Detail>
            <Detail label='Address'>{driver.address}</Detail>
            <Detail label='Service radius'>{driver.serviceRadiusKm} km</Detail>
            <Detail label='Cars'>{driver.vehicleTypes.map((t) => CAR_TYPES[t]).join(', ')}</Detail>
            <Detail label='Gears'>{driver.transmissions.map((t) => TRANSMISSIONS[t]).join(', ')}</Detail>
            <Detail label='Rates'>{[driver.rates?.hourly && `${rupees(driver.rates.hourly)}/h`, driver.rates?.fullDay && `${rupees(driver.rates.fullDay)}/day`, driver.rates?.outstationPerDay && `${rupees(driver.rates.outstationPerDay)}/outstation day`].filter(Boolean).join(' · ')}</Detail>
            <Detail label='Cancellation rate'>{driver.cancellationRate}%</Detail>
          </div>
          <div className='flex flex-wrap gap-1'>{driver.services.map((s) => <Badge key={s} tone='teal'>{BOOKING_TYPES[s]?.label}</Badge>)}</div>
          {driver.about && <p className='text-sm text-gray-700'>{driver.about}</p>}
          {driver.verification.note && <p className='text-sm text-gray-600'>Last note: {driver.verification.note}</p>}

          <Card className='space-y-3 bg-gray-50'>
            <Field label='Note to driver (required to reject)'><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
            <ErrorNote>{update.error && errorMessage(update.error)}</ErrorNote>
            <div className='flex flex-wrap gap-2'>
              {driver.verification.status !== 'verified' && (
                <Button loading={update.isPending} onClick={() => update.mutate({ path: 'verification', body: { status: 'verified', note: note || undefined }, message: 'Driver verified' })}>Verify driver</Button>
              )}
              {driver.verification.status !== 'rejected' && (
                <Button variant='danger' disabled={!note} loading={update.isPending} onClick={() => update.mutate({ path: 'verification', body: { status: 'rejected', note }, message: 'Driver rejected' })}>Reject</Button>
              )}
              {driver.accountStatus === 'active'
                ? <Button variant='secondary' loading={update.isPending} onClick={() => update.mutate({ path: 'account-status', body: { accountStatus: 'suspended' }, message: 'Driver suspended' })}>Suspend account</Button>
                : <Button variant='secondary' loading={update.isPending} onClick={() => update.mutate({ path: 'account-status', body: { accountStatus: 'active' }, message: 'Driver reactivated' })}>Reactivate account</Button>}
            </div>
          </Card>

          {data.recentBookings.length > 0 && (
            <div>
              <p className='mb-2 font-semibold'>Recent bookings</p>
              <ul className='space-y-1 text-sm'>
                {data.recentBookings.map((b) => (
                  <li key={b._id} className='flex justify-between gap-2'><span>{shortDate(b.startTime)} · {fullName(b.customer)}</span><StatusBadge status={b.status} /></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
