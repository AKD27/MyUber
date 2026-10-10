import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { STATUS, CAR_TYPES } from '../../lib/constants'
import { dateTime, fullName, timeAgo } from '../../lib/format'
import { toast } from '../../store/toast'
import Pagination from './Pagination'
import { Badge, Button, buttonClass, Card, EmptyState, ErrorNote, Field, Icon, Modal, PageHeader, Spinner, Tabs, Textarea } from '../../components/ui'
import { cx } from '../../lib/cx'

const TABS = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
]

const mapsUrl = (location) => `https://www.google.com/maps/search/?api=1&query=${location.coordinates[1]},${location.coordinates[0]}`

function Person({ role, person, raisedBy }) {
  return (
    <div className={cx('rounded-xl p-3', raisedBy ? 'bg-red-50 ring-1 ring-inset ring-red-600/15' : 'bg-slate-50')}>
      <p className='text-xs font-medium text-slate-500'>{role}{raisedBy && <span className='font-bold text-red-700'> · raised the alert</span>}</p>
      <p className='font-bold text-slate-900'>{fullName(person) || 'Unknown'}</p>
      {person?.phone && <a href={`tel:${person.phone}`} className='tabular inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline'><Icon name='ri-phone-fill' />{person.phone}</a>}
    </div>
  )
}

export default function AdminSafety() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('open')
  const [page, setPage] = useState(1)
  const [resolving, setResolving] = useState(null)
  const [note, setNote] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sos', status, page],
    queryFn: () => api.get('/admin/sos', { params: { status, page } }).then((res) => res.data),
    refetchInterval: status === 'open' ? 15 * 1000 : false,
  })

  const resolve = useMutation({
    mutationFn: () => api.patch(`/admin/sos/${resolving._id}/resolve`, { resolutionNote: note.trim() }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sos'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast('Alert resolved', 'success')
      close()
    },
  })

  const close = () => { setResolving(null); setNote('') }

  return (
    <div>
      <PageHeader title='Safety alerts' subtitle='SOS alerts raised by customers and drivers during a booking. Open alerts refresh automatically.' />
      <Tabs tabs={TABS} value={status} onChange={(value) => { setStatus(value); setPage(1) }} className='sm:inline-flex' />
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.items.length === 0 && (
        <EmptyState icon='ri-shield-check-line' title={status === 'open' ? 'No open alerts' : 'No resolved alerts yet'}>
          {status === 'open' ? 'When someone presses SOS during a booking, it appears here immediately.' : 'Alerts you resolve are kept here.'}
        </EmptyState>
      )}

      <div className='grid gap-4 lg:grid-cols-2'>
        {data?.items.map((alert) => (
          <Card key={alert._id} className={alert.status === 'open' ? 'border-red-300 ring-1 ring-red-600/10' : ''}>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <p className='flex items-center gap-2 font-extrabold text-slate-900'>
                <span className={cx('flex h-9 w-9 items-center justify-center rounded-full text-lg', alert.status === 'open' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500')}><Icon name='ri-alarm-warning-fill' /></span>
                SOS · {timeAgo(alert.createdAt)}
              </p>
              {alert.status === 'open' ? <Badge dot tone='red'>Open</Badge> : <Badge dot tone='green'>Resolved</Badge>}
            </div>

            <div className='mt-4 grid grid-cols-2 gap-2'>
              <Person role='Customer' person={alert.customer} raisedBy={alert.raisedByRole === 'customer'} />
              <Person role='Driver' person={alert.driver} raisedBy={alert.raisedByRole === 'driver'} />
            </div>

            {alert.booking && (
              <dl className='mt-4 space-y-1.5 text-sm text-slate-600'>
                <div className='flex gap-2'><dt className='w-20 shrink-0 text-slate-400'>Booking</dt><dd>{STATUS[alert.booking.status]?.label} · scheduled for {dateTime(alert.booking.startTime)}</dd></div>
                <div className='flex gap-2'><dt className='w-20 shrink-0 text-slate-400'>Pickup</dt><dd>{alert.booking.pickup?.address}</dd></div>
                {alert.booking.destination && <div className='flex gap-2'><dt className='w-20 shrink-0 text-slate-400'>Destination</dt><dd>{alert.booking.destination.address}</dd></div>}
                <div className='flex gap-2'><dt className='w-20 shrink-0 text-slate-400'>Car</dt><dd>{alert.booking.vehicle?.model || CAR_TYPES[alert.booking.vehicle?.type]}</dd></div>
              </dl>
            )}

            {alert.resolutionNote && <p className='mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600'><b className='text-slate-900'>Resolution:</b> {alert.resolutionNote}</p>}

            <div className='mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4'>
              {alert.location?.coordinates
                ? <a href={mapsUrl(alert.location)} target='_blank' rel='noreferrer' className={buttonClass({ variant: 'secondary', size: 'sm' })}><Icon name='ri-map-pin-2-fill' />Open location in Maps</a>
                : <span className='flex items-center gap-1.5 text-xs text-slate-500'><Icon name='ri-map-pin-line' />No location was shared with this alert</span>}
              {alert.status === 'open' && <Button size='sm' className='ml-auto' onClick={() => { resolve.reset(); setResolving(alert) }}>Mark as resolved</Button>}
            </div>
          </Card>
        ))}
      </div>
      <Pagination data={data} page={page} onChange={setPage} />

      <Modal open={Boolean(resolving)} onClose={close} title='Resolve this alert'>
        <div className='space-y-4'>
          <Field label='What was done?' hint='For example: called the customer, everyone is safe.'><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></Field>
          <ErrorNote>{resolve.error && errorMessage(resolve.error)}</ErrorNote>
          <div className='flex gap-2'>
            <Button variant='secondary' className='flex-1' onClick={close}>Cancel</Button>
            <Button variant='brand' className='flex-1' disabled={note.trim().length < 3} loading={resolve.isPending} onClick={() => resolve.mutate()}>Resolve alert</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
