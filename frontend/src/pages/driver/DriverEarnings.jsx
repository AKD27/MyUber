import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { rupees, shortDate, bookingTypeLabel, durationLabel, clockTime, fullName } from '../../lib/format'
import { Card, EmptyState, ErrorNote, Icon, PageHeader, SectionTitle, Spinner, Stars, StatTile, Table } from '../../components/ui'

const dayLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })
const dayNumber = (date) => Number(date.slice(8))

// Net earnings per day as bars; the tallest day fills the chart.
function DailyChart({ days }) {
  const max = Math.max(...days.map((day) => day.net), 1)
  const total = days.reduce((sum, day) => sum + day.net, 0)

  return (
    <Card>
      <SectionTitle action={<span className='tabular text-sm font-bold text-slate-900'>{rupees(total)}</span>}>Last 14 days</SectionTitle>
      <div className='flex h-40 items-end gap-1.5 sm:gap-2.5' role='img' aria-label={`Earnings for the last 14 days, ${rupees(total)} in total`}>
        {days.map((day, index) => (
          <div key={day.date} className='group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5'>
            <span className='tabular pointer-events-none absolute -top-1 z-10 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white group-hover:block'>{rupees(day.net)} · {day.trips} {day.trips === 1 ? 'trip' : 'trips'}</span>
            <div className={`w-full rounded-t-md transition-colors ${index === days.length - 1 ? 'bg-brand-600' : 'bg-brand-200 group-hover:bg-brand-400'}`} style={{ height: `${Math.max(day.net ? 6 : 2, (day.net / max) * 100)}%` }} />
            <span className='text-[10px] font-medium leading-none text-slate-400'><span className='max-sm:hidden'>{dayLabel(day.date)} </span>{dayNumber(day.date)}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function DriverEarnings() {
  const earnings = useQuery({ queryKey: ['driver-earnings'], queryFn: () => api.get('/drivers/me/earnings').then((res) => res.data) })
  const reviews = useQuery({ queryKey: ['driver-reviews'], queryFn: () => api.get('/drivers/me/reviews').then((res) => res.data) })

  if (earnings.isLoading) return <Spinner />
  if (earnings.error) return <ErrorNote>{errorMessage(earnings.error)}</ErrorNote>

  const e = earnings.data
  const trips = (count) => `${count} ${count === 1 ? 'trip' : 'trips'}`

  return (
    <div className='space-y-6'>
      <PageHeader title='Earnings' subtitle='What you keep after the platform fee. Customers pay you in cash.' />

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <StatTile icon='ri-sun-line' tone='brand' label='Today' value={rupees(e.today.net)} hint={trips(e.today.trips)} />
        <StatTile icon='ri-calendar-line' tone='blue' label='Last 7 days' value={rupees(e.last7Days.net)} hint={trips(e.last7Days.trips)} />
        <StatTile icon='ri-calendar-2-line' label='Last 30 days' value={rupees(e.last30Days.net)} hint={trips(e.last30Days.trips)} />
        <StatTile icon='ri-wallet-3-line' tone='amber' label='All time' value={rupees(e.allTime.net)} hint={trips(e.allTime.trips)} />
      </div>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]'>
        <DailyChart days={e.daily} />
        <Card>
          <SectionTitle>All-time summary</SectionTitle>
          <dl className='space-y-3 text-sm'>
            <div className='flex justify-between gap-3'><dt className='text-slate-500'>Cash collected</dt><dd className='tabular font-semibold text-slate-900'>{rupees(e.allTime.gross)}</dd></div>
            <div className='flex justify-between gap-3'><dt className='text-slate-500'>Platform fee</dt><dd className='tabular font-semibold text-slate-900'>−{rupees(e.allTime.commission)}</dd></div>
            <div className='flex justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2.5 font-extrabold text-brand-800'><dt>Your earnings</dt><dd className='tabular'>{rupees(e.allTime.net)}</dd></div>
          </dl>
          <p className='mt-3 flex gap-1.5 text-xs leading-relaxed text-slate-500'><Icon name='ri-information-line' className='mt-0.5' />The platform fee is settled with the platform separately, because you collect the full amount in cash.</p>
        </Card>
      </div>

      <section>
        <SectionTitle>Paid trips</SectionTitle>
        {e.trips.length === 0 ? (
          <EmptyState icon='ri-wallet-3-line' title='No paid trips yet'>Completed trips appear here once you confirm the cash payment.</EmptyState>
        ) : (
          <Table head={['Paid on', 'Trip', 'Customer', 'Collected', 'Fee', 'You keep']}>
            {e.trips.map((trip) => (
              <tr key={trip._id}>
                <td className='whitespace-nowrap px-4 py-3'>{shortDate(trip.payment.paidAt)}<p className='text-xs text-slate-500'>{clockTime(trip.payment.paidAt)}</p></td>
                <td className='px-4 py-3 font-medium text-slate-900'>{bookingTypeLabel(trip)}<p className='text-xs font-normal text-slate-500'>{durationLabel(trip.duration)}</p></td>
                <td className='px-4 py-3'>{fullName(trip.customer) || '—'}</td>
                <td className='tabular px-4 py-3'>{rupees(trip.pricing.driverCharges)}</td>
                <td className='tabular px-4 py-3 text-slate-500'>−{rupees(trip.pricing.platformCommission)}</td>
                <td className='tabular px-4 py-3 font-bold text-brand-700'>{rupees(trip.pricing.driverEarning)}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section>
        <SectionTitle>What customers say</SectionTitle>
        {reviews.data?.length === 0 && <EmptyState icon='ri-star-smile-line' title='No reviews yet'>Ratings from your customers appear here after each trip.</EmptyState>}
        <div className='grid gap-3 md:grid-cols-2'>
          {reviews.data?.map((review) => (
            <Card key={review._id}>
              <div className='flex items-center justify-between gap-2'>
                <Stars value={review.rating} />
                <span className='text-xs text-slate-400'>{review.customerName || 'Customer'} · {shortDate(review.createdAt)}</span>
              </div>
              <p className='mt-2 text-sm leading-relaxed text-slate-600'>{review.comment || <span className='text-slate-400'>No comment</span>}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
