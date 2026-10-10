import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../lib/api'
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, BOOKING_TYPES, EMERGENCY_NUMBER, SUPPORT_PHONE } from '../lib/constants'
import { friendlyDateTime, shortDate } from '../lib/format'
import { ComplaintDialog } from '../components/BookingParts'
import { Badge, Button, Card, EmptyState, ErrorNote, Icon, ListSkeleton, Note, PageHeader, SectionTitle } from '../components/ui'

// Help for customers and drivers: report an issue and follow what support did about it.
export default function Support() {
  const [open, setOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => api.get('/support/complaints').then((res) => res.data),
  })

  return (
    <div className='mx-auto max-w-3xl'>
      <PageHeader title='Support' subtitle='Tell us about a problem and follow our reply here.'
        action={<Button variant='brand' onClick={() => setOpen(true)}><Icon name='ri-flag-line' />Report an issue</Button>} />

      <div className='mb-6 grid gap-3 sm:grid-cols-2'>
        <a href={`tel:${EMERGENCY_NUMBER}`} className='flex items-center gap-3.5 rounded-2xl bg-red-50 p-4 ring-1 ring-inset ring-red-600/10 transition-colors hover:bg-red-100'>
          <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-xl text-white'><Icon name='ri-alarm-warning-fill' /></span>
          <span><span className='block text-sm font-bold text-red-800'>Emergency? Call {EMERGENCY_NUMBER}</span><span className='block text-xs text-red-700/80'>During a trip, use the SOS button on your booking.</span></span>
        </a>
        {SUPPORT_PHONE ? (
          <a href={`tel:${SUPPORT_PHONE}`} className='flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200/80 transition-colors hover:bg-slate-50'>
            <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-700'><Icon name='ri-customer-service-2-fill' /></span>
            <span><span className='block text-sm font-bold text-slate-900'>Call support</span><span className='block text-xs text-slate-500'>{SUPPORT_PHONE}</span></span>
          </a>
        ) : (
          <Note icon='ri-time-line' className='items-center'>Our team reviews every report and replies here in the app.</Note>
        )}
      </div>

      <SectionTitle>Your reports</SectionTitle>
      {isLoading && <ListSkeleton count={2} />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {data?.length === 0 && <EmptyState icon='ri-chat-smile-3-line' title='No reports yet'>If something goes wrong with a booking, report it here or from the booking itself.</EmptyState>}

      <div className='space-y-3'>
        {data?.map((complaint) => (
          <Card key={complaint._id}>
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <div>
                <p className='font-bold text-slate-900'>{COMPLAINT_CATEGORIES[complaint.category]}</p>
                <p className='text-xs text-slate-500'>
                  Reported {shortDate(complaint.createdAt)}
                  {complaint.booking && ` · ${BOOKING_TYPES[complaint.booking.bookingType]?.label} booking, ${friendlyDateTime(complaint.booking.startTime)}`}
                </p>
              </div>
              <Badge dot tone={COMPLAINT_STATUS[complaint.status].tone}>{COMPLAINT_STATUS[complaint.status].label}</Badge>
            </div>
            <p className='mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700'>{complaint.description}</p>
            {complaint.resolutionNote && (
              <Note tone='brand' icon='ri-customer-service-2-fill' className='mt-3'><b>Support:</b> {complaint.resolutionNote}</Note>
            )}
          </Card>
        ))}
      </div>

      <ComplaintDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
