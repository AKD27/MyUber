import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, BOOKING_TYPES } from '../../lib/constants'
import { dateTime, fullName, timeAgo } from '../../lib/format'
import { toast } from '../../store/toast'
import Pagination from './Pagination'
import { Badge, Button, Card, Detail, EmptyState, ErrorNote, Field, Modal, Note, PageHeader, Spinner, Tabs, Textarea } from '../../components/ui'

const TABS = [
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
]

export default function AdminComplaints() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('open')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-complaints', status, page],
    queryFn: () => api.get('/admin/complaints', { params: { status: status === 'all' ? undefined : status, page } }).then((res) => res.data),
  })

  const update = useMutation({
    mutationFn: (body) => api.patch(`/admin/complaints/${selected._id}`, body).then((res) => res.data),
    onSuccess: (complaint) => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast(complaint.status === 'resolved' ? 'Complaint resolved. The reporter was notified.' : 'Marked as in review', 'success')
      close()
    },
  })

  const open = (complaint) => { update.reset(); setNote(complaint.resolutionNote || ''); setSelected(complaint) }
  const close = () => { setSelected(null); setNote('') }
  const reporter = (complaint) => complaint[complaint.raisedByRole]

  return (
    <div>
      <PageHeader title='Complaints' subtitle='Issues reported by customers and drivers.' />
      <Tabs tabs={TABS} value={status} onChange={(value) => { setStatus(value); setPage(1) }} className='sm:inline-flex' />
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.items.length === 0 && <EmptyState icon='ri-feedback-line' title='Nothing here'>Complaints with this status will appear here.</EmptyState>}

      <div className='grid gap-3 lg:grid-cols-2'>
        {data?.items.map((complaint) => (
          <Card key={complaint._id} className='flex flex-col'>
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <div>
                <p className='font-bold text-slate-900'>{COMPLAINT_CATEGORIES[complaint.category]}</p>
                <p className='text-xs text-slate-500'>{fullName(reporter(complaint)) || 'Unknown'} ({complaint.raisedByRole}) · {timeAgo(complaint.createdAt)}</p>
              </div>
              <Badge dot tone={COMPLAINT_STATUS[complaint.status].tone}>{COMPLAINT_STATUS[complaint.status].label}</Badge>
            </div>
            <p className='mt-3 line-clamp-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-slate-700'>{complaint.description}</p>
            <div className='mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3'>
              <span className='truncate text-xs text-slate-500'>{complaint.booking ? `${BOOKING_TYPES[complaint.booking.bookingType]?.label} booking · ${dateTime(complaint.booking.startTime)}` : 'Not about a booking'}</span>
              <Button variant='secondary' size='sm' onClick={() => open(complaint)}>{complaint.status === 'resolved' ? 'View' : 'Handle'}</Button>
            </div>
          </Card>
        ))}
      </div>
      <Pagination data={data} page={page} onChange={setPage} />

      <Modal open={Boolean(selected)} onClose={close} title='Complaint' size='lg'>
        {selected && (
          <div className='space-y-5'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <p className='text-lg font-extrabold text-slate-900'>{COMPLAINT_CATEGORIES[selected.category]}</p>
              <Badge dot tone={COMPLAINT_STATUS[selected.status].tone}>{COMPLAINT_STATUS[selected.status].label}</Badge>
            </div>
            <p className='whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700'>{selected.description}</p>

            <div className='grid gap-4 sm:grid-cols-2'>
              <Detail label={`Reported by (${selected.raisedByRole})`}>{fullName(reporter(selected))}<span className='block font-normal text-slate-500'>{reporter(selected)?.phone} · {reporter(selected)?.email}</span></Detail>
              <Detail label='Reported'>{dateTime(selected.createdAt)}</Detail>
              {selected.booking && <>
                <Detail label='Customer'>{fullName(selected.customer)}<span className='block font-normal text-slate-500'>{selected.customer?.phone}</span></Detail>
                <Detail label='Driver'>{fullName(selected.driver)}<span className='block font-normal text-slate-500'>{selected.driver?.phone}</span></Detail>
                <Detail label='Booking'>{BOOKING_TYPES[selected.booking.bookingType]?.label} · {dateTime(selected.booking.startTime)}</Detail>
                <Detail label='Pickup'>{selected.booking.pickup?.address}</Detail>
              </>}
            </div>

            {selected.status === 'resolved' ? (
              <Note tone='brand' icon='ri-checkbox-circle-fill'><b>Resolved {selected.resolvedAt && dateTime(selected.resolvedAt)}:</b> {selected.resolutionNote}</Note>
            ) : (
              <div className='space-y-3 rounded-2xl border border-slate-200 p-4'>
                <Field label='Resolution note' hint='Required to resolve. The reporter sees this note.'><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder='What was found and what was done about it' /></Field>
                <ErrorNote>{update.error && errorMessage(update.error)}</ErrorNote>
                <div className='flex flex-wrap gap-2'>
                  {selected.status === 'open' && <Button variant='secondary' disabled={update.isPending} onClick={() => update.mutate({ status: 'in_review', resolutionNote: note.trim() || undefined })}>Mark as in review</Button>}
                  <Button variant='brand' disabled={!note.trim()} loading={update.isPending} onClick={() => update.mutate({ status: 'resolved', resolutionNote: note.trim() })}>Resolve complaint</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
