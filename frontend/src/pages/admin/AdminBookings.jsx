import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { STATUS, CANCELLABLE_STATUSES } from '../../lib/constants'
import { rupees, dateTime, fullName, bookingTypeLabel, durationLabel, bookingRef, shortAddress } from '../../lib/format'
import { toast } from '../../store/toast'
import Pagination from './Pagination'
import { BookingDetails, BookingTimeline, PriceBreakdown } from '../../components/BookingParts'
import { Button, Detail, EmptyState, ErrorNote, Field, Modal, PageHeader, Select, Spinner, StatusBadge, Table, Textarea } from '../../components/ui'

export default function AdminBookings() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-bookings', status, page],
    queryFn: () => api.get('/admin/bookings', { params: { status: status || undefined, page } }).then((res) => res.data),
  })

  return (
    <div>
      <PageHeader title='Bookings' subtitle='Every booking on the platform, newest first.' action={
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className='w-auto' aria-label='Filter by status'>
          <option value=''>All statuses</option>
          {Object.entries(STATUS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
        </Select>
      } />
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.items.length === 0 && <EmptyState icon='ri-file-list-3-line' title='No bookings found'>{status ? 'No booking has this status right now.' : 'Bookings appear here as customers make them.'}</EmptyState>}
      {data?.items.length > 0 && (
        <Table head={['Booking', 'Customer', 'Driver', 'Pickup → Destination', 'Date', 'Duration', 'Amount', 'Status', '']}>
          {data.items.map((b) => (
            <tr key={b._id} className='align-top hover:bg-slate-50/60'>
              <td className='tabular px-4 py-3 font-semibold text-slate-900'>{bookingRef(b)}</td>
              <td className='px-4 py-3'><p className='whitespace-nowrap font-medium text-slate-900'>{fullName(b.customer) || '—'}</p><p className='tabular text-xs text-slate-500'>{b.customer?.phone}</p></td>
              <td className='px-4 py-3'><p className='whitespace-nowrap font-medium text-slate-900'>{fullName(b.driver) || '—'}</p><p className='tabular text-xs text-slate-500'>{b.driver?.phone}</p></td>
              <td className='max-w-[220px] px-4 py-3'><p className='truncate'>{shortAddress(b.pickup.address)}</p>{b.destination && <p className='truncate text-slate-500'>→ {shortAddress(b.destination.address)}</p>}</td>
              <td className='whitespace-nowrap px-4 py-3'>{dateTime(b.startTime)}</td>
              <td className='px-4 py-3'><p className='whitespace-nowrap'>{bookingTypeLabel(b)}</p><p className='text-xs text-slate-500'>{durationLabel(b.duration)}</p></td>
              <td className='tabular px-4 py-3'><p className='font-semibold text-slate-900'>{rupees(b.pricing.driverCharges)}</p><p className='whitespace-nowrap text-xs text-slate-500'>fee {rupees(b.pricing.platformCommission)}</p></td>
              <td className='px-4 py-3'><StatusBadge status={b.status} /></td>
              <td className='px-4 py-3 text-right'><Button variant='secondary' size='sm' onClick={() => setSelected(b._id)}>View</Button></td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination data={data} page={page} onChange={setPage} />
      <BookingDetail bookingId={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function BookingDetail({ bookingId, onClose }) {
  const queryClient = useQueryClient()
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['admin-booking', bookingId],
    queryFn: () => api.get(`/admin/bookings/${bookingId}`).then((res) => res.data),
    enabled: Boolean(bookingId),
  })

  const cancel = useMutation({
    mutationFn: () => api.post(`/admin/bookings/${bookingId}/cancel`, { reason: reason.trim() }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-booking', bookingId] })
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      setCancelling(false)
      setReason('')
      toast('Booking cancelled. The customer and driver were told.', 'success')
    },
  })

  const close = () => { setCancelling(false); setReason(''); cancel.reset(); onClose() }

  return (
    <Modal open={Boolean(bookingId)} onClose={close} title={booking ? `Booking ${bookingRef(booking)}` : 'Booking'} size='lg'>
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {booking && (
        <div className='space-y-5'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <StatusBadge status={booking.status} />
            <span className='text-xs text-slate-500'>Created {dateTime(booking.createdAt)}</span>
          </div>

          <div className='grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2'>
            <Detail label='Customer'>{fullName(booking.customer)}<span className='block font-normal text-slate-500'>{booking.customer?.phone} · {booking.customer?.email}</span></Detail>
            <Detail label='Driver'>{fullName(booking.driver)}<span className='block font-normal text-slate-500'>{booking.driver?.phone} · {booking.driver?.email}</span></Detail>
          </div>

          <BookingDetails booking={booking} carLabel='Customer’s car' />

          <div className='grid gap-5 sm:grid-cols-2'>
            <div><p className='mb-3 text-sm font-bold text-slate-900'>Payment</p><PriceBreakdown pricing={booking.pricing} perspective='driver' paid={booking.payment?.status === 'paid'} /></div>
            <div><p className='mb-3 text-sm font-bold text-slate-900'>Progress</p><BookingTimeline booking={booking} /></div>
          </div>

          {CANCELLABLE_STATUSES.includes(booking.status) && (
            <div className='rounded-2xl border border-slate-200 p-4'>
              {!cancelling ? (
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <p className='text-sm text-slate-600'>The trip has not started. Support can cancel it for either side.</p>
                  <Button variant='danger-soft' onClick={() => setCancelling(true)}>Cancel booking</Button>
                </div>
              ) : (
                <div className='space-y-3'>
                  <Field label='Reason' hint='Shown to the customer and the driver.'><Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className='min-h-[72px]' /></Field>
                  <ErrorNote>{cancel.error && errorMessage(cancel.error)}</ErrorNote>
                  <div className='flex gap-2'>
                    <Button variant='secondary' className='flex-1' onClick={() => setCancelling(false)}>Keep booking</Button>
                    <Button variant='danger' className='flex-1' disabled={reason.trim().length < 3} loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel booking</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
