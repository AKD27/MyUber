import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS, WEEKDAYS } from '../../lib/constants'
import { rupees, shortDate, fullName } from '../../lib/format'
import { toast } from '../../store/toast'
import Avatar from '../../components/Avatar'
import Pagination, { SearchBox } from './Pagination'
import { Badge, Button, Detail, EmptyState, ErrorNote, Field, Modal, Note, PageHeader, Spinner, Stars, StatusBadge, Table, Tabs, Textarea, VerificationBadge } from '../../components/ui'

const TABS = [
  { value: 'under_review', label: 'Waiting for review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'pending', label: 'Incomplete' },
  { value: 'all', label: 'All' },
]

export default function AdminDrivers() {
  const [params, setParams] = useSearchParams()
  const status = TABS.some((tab) => tab.value === params.get('status')) ? params.get('status') : 'under_review'
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-drivers', status, query, page],
    queryFn: () => api.get('/admin/drivers', { params: { verificationStatus: status === 'all' ? undefined : status, search: query || undefined, page } }).then((res) => res.data),
  })

  return (
    <div>
      <PageHeader title='Drivers' subtitle='Verify new drivers and manage existing ones.' />
      <Tabs tabs={TABS} value={status} onChange={(value) => { setParams({ status: value }); setPage(1) }} className='lg:inline-flex' />
      <SearchBox onSearch={(text) => { setQuery(text); setPage(1) }} />
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.items.length === 0 && <EmptyState icon='ri-steering-2-line' title='No drivers here'>{query ? 'Nothing matches this search.' : 'Drivers in this state will appear here.'}</EmptyState>}
      {data?.items.length > 0 && (
        <Table head={['Driver', 'Phone', 'Status', 'Rating', 'Trips', 'Joined', '']}>
          {data.items.map((driver) => (
            <tr key={driver._id} className='hover:bg-slate-50/60'>
              <td className='px-4 py-3'>
                <div className='flex items-center gap-3'>
                  <Avatar person={driver} size='h-9 w-9' className='text-xs' />
                  <div className='min-w-0'><p className='truncate font-semibold text-slate-900'>{fullName(driver)}</p><p className='truncate text-xs text-slate-500'>{driver.email}</p></div>
                </div>
              </td>
              <td className='tabular whitespace-nowrap px-4 py-3'>{driver.phone}</td>
              <td className='px-4 py-3'><div className='flex flex-wrap gap-1'><VerificationBadge status={driver.verification.status} />{driver.accountStatus === 'suspended' && <Badge tone='red'>Suspended</Badge>}{driver.isOnline && <Badge dot tone='green'>Online</Badge>}</div></td>
              <td className='px-4 py-3'><Stars value={driver.rating.average} count={driver.rating.count} /></td>
              <td className='tabular px-4 py-3'>{driver.stats.completedTrips}</td>
              <td className='whitespace-nowrap px-4 py-3 text-slate-500'>{shortDate(driver.createdAt)}</td>
              <td className='px-4 py-3 text-right'><Button variant='secondary' size='sm' onClick={() => setSelected(driver._id)}>{driver.verification.status === 'under_review' ? 'Review' : 'View'}</Button></td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination data={data} page={page} onChange={setPage} />
      <DriverReview driverId={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

const workingHours = (hours) => (hours?.enabled ? `${hours.days.map((day) => WEEKDAYS[day]).join(', ')} · ${hours.start}–${hours.end}` : 'Any time')

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

  const close = () => { setNote(''); update.reset(); onClose() }
  const driver = data?.driver
  const pending = (key) => update.isPending && update.variables?.key === key
  const act = (key, path, body, message) => update.mutate({ key, path, body, message })

  return (
    <Modal open={Boolean(driverId)} onClose={close} title='Driver details' size='lg'>
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {driver && (
        <div className='space-y-5'>
          <div className='flex flex-wrap items-center gap-4'>
            <Avatar person={driver} size='h-16 w-16' className='text-xl' />
            <div className='min-w-0 flex-1'>
              <p className='text-lg font-extrabold text-slate-900'>{fullName(driver)}</p>
              <p className='truncate text-sm text-slate-500'>{driver.email} · {driver.phone}</p>
            </div>
            <div className='flex flex-wrap gap-1'>
              <VerificationBadge status={driver.verification.status} />
              {driver.accountStatus === 'suspended' && <Badge tone='red'>Suspended</Badge>}
            </div>
          </div>

          {data.missingFields.length > 0 && <Note tone='amber' icon='ri-error-warning-fill'><b>Profile incomplete:</b> {data.missingFields.join(', ')}</Note>}

          <div className='grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3'>
            <Detail label='Experience'>{driver.experienceYears} years</Detail>
            <Detail label='Languages'>{driver.languages.join(', ')}</Detail>
            <Detail label='Rating'><Stars value={driver.rating.average} count={driver.rating.count} /></Detail>
            <Detail label='Licence number'>{driver.licence?.number}</Detail>
            <Detail label='Licence valid until'>{driver.licence?.expiry && shortDate(driver.licence.expiry)}</Detail>
            <Detail label='Emergency contact'>{driver.emergencyContact?.name && `${driver.emergencyContact.name} · ${driver.emergencyContact.phone}`}</Detail>
            <Detail label='Address'>{driver.address}</Detail>
            <Detail label='Service radius'>{driver.serviceRadiusKm} km</Detail>
            <Detail label='Working hours'>{workingHours(driver.workingHours)}</Detail>
            <Detail label='Cars'>{driver.vehicleTypes.map((t) => CAR_TYPES[t]).join(', ')}</Detail>
            <Detail label='Gears'>{driver.transmissions.map((t) => TRANSMISSIONS[t]).join(', ')}</Detail>
            <Detail label='Rates'>{[driver.rates?.hourly && `${rupees(driver.rates.hourly)}/h`, driver.rates?.fullDay && `${rupees(driver.rates.fullDay)}/day`, driver.rates?.outstationPerDay && `${rupees(driver.rates.outstationPerDay)}/outstation day`].filter(Boolean).join(' · ')}</Detail>
          </div>

          {driver.services.length > 0 && <div className='flex flex-wrap gap-1.5'>{driver.services.map((s) => <Badge key={s} tone='brand'>{BOOKING_TYPES[s]?.label}</Badge>)}</div>}
          {driver.about && <p className='rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-600'>{driver.about}</p>}

          <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {[
              ['Completed trips', data.earnings.trips],
              ['Driver earnings', rupees(data.earnings.net)],
              ['Platform revenue', rupees(data.earnings.commission)],
              ['Cancellation rate', `${driver.cancellationRate}%`],
            ].map(([label, value]) => (
              <div key={label} className='rounded-xl bg-slate-50 p-3'><p className='tabular text-lg font-extrabold text-slate-900'>{value}</p><p className='text-xs text-slate-500'>{label}</p></div>
            ))}
          </div>
          {data.complaints > 0 && <Note tone='red' icon='ri-feedback-fill'>{data.complaints} {data.complaints === 1 ? 'complaint' : 'complaints'} from customers about this driver.</Note>}

          <div className='space-y-3 rounded-2xl border border-slate-200 p-4'>
            <p className='text-sm font-bold text-slate-900'>Decision</p>
            {driver.verification.note && <p className='text-sm text-slate-500'>Last note: “{driver.verification.note}”</p>}
            <Field label='Note to the driver' hint='Required to reject. The driver sees this note.'><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className='min-h-[72px]' /></Field>
            <ErrorNote>{update.error && errorMessage(update.error)}</ErrorNote>
            <div className='flex flex-wrap gap-2'>
              {driver.verification.status !== 'verified' && (
                <Button variant='brand' disabled={update.isPending} loading={pending('verify')} onClick={() => act('verify', 'verification', { status: 'verified', note: note.trim() || undefined }, 'Driver verified')}>Verify driver</Button>
              )}
              {driver.verification.status !== 'rejected' && (
                <Button variant='danger' disabled={!note.trim() || update.isPending} loading={pending('reject')} onClick={() => act('reject', 'verification', { status: 'rejected', note: note.trim() }, 'Driver rejected')}>Reject</Button>
              )}
              {driver.accountStatus === 'active'
                ? <Button variant='secondary' disabled={update.isPending} loading={pending('suspend')} onClick={() => act('suspend', 'account-status', { accountStatus: 'suspended' }, 'Driver suspended')}>Suspend account</Button>
                : <Button variant='secondary' disabled={update.isPending} loading={pending('activate')} onClick={() => act('activate', 'account-status', { accountStatus: 'active' }, 'Driver reactivated')}>Reactivate account</Button>}
            </div>
          </div>

          {data.recentBookings.length > 0 && (
            <div>
              <p className='mb-2 text-sm font-bold text-slate-900'>Recent bookings</p>
              <ul className='divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm'>
                {data.recentBookings.map((b) => (
                  <li key={b._id} className='flex items-center justify-between gap-2 px-3.5 py-2.5'>
                    <span className='min-w-0 truncate'>{shortDate(b.startTime)} · {fullName(b.customer)} · <span className='tabular'>{rupees(b.pricing.driverCharges)}</span></span>
                    <StatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
