import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS } from '../../lib/constants'
import { rupees, shortDate } from '../../lib/format'
import Avatar from '../../components/Avatar'
import { Badge, Button, ErrorNote, Icon, Modal, Spinner, Stars, VerificationBadge } from '../../components/ui'

function Metric({ value, label }) {
  return (
    <div className='rounded-xl bg-slate-50 px-2 py-3 text-center'>
      <p className='tabular text-lg font-extrabold text-slate-900'>{value}</p>
      <p className='text-xs text-slate-500'>{label}</p>
    </div>
  )
}

function Rate({ label, amount, unit }) {
  if (!amount) return null
  return (
    <div className='flex items-baseline justify-between gap-3 py-2 text-sm'>
      <span className='text-slate-600'>{label}</span>
      <span className='tabular font-bold text-slate-900'>{rupees(amount)}<span className='font-normal text-slate-500'> {unit}</span></span>
    </div>
  )
}

export default function DriverProfileModal({ driverId, onClose, onBook }) {
  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: () => api.get(`/drivers/${driverId}`).then((res) => res.data),
    enabled: Boolean(driverId),
  })

  return (
    <Modal open={Boolean(driverId)} onClose={onClose} title='Driver profile'>
      {isLoading && <Spinner />}
      <ErrorNote>{error && errorMessage(error)}</ErrorNote>
      {driver && (
        <div className='space-y-5'>
          <div className='flex items-center gap-4'>
            <Avatar person={driver} size='h-[72px] w-[72px]' className='text-xl' />
            <div className='min-w-0'>
              <p className='text-xl font-extrabold tracking-tight text-slate-900'>{driver.fullname.firstname} {driver.fullname.lastname}</p>
              <div className='mt-1 flex flex-wrap items-center gap-2'>
                <Stars value={driver.rating.average} count={driver.rating.count} />
                {driver.verified && <VerificationBadge status='verified' />}
              </div>
            </div>
          </div>

          <div className='grid grid-cols-3 gap-2'>
            <Metric value={`${driver.experienceYears} yrs`} label='Experience' />
            <Metric value={driver.completedTrips.toLocaleString('en-IN')} label='Trips' />
            <Metric value={`${driver.cancellationRate}%`} label='Cancellations' />
          </div>

          {driver.about && <p className='text-sm leading-relaxed text-slate-600'>{driver.about}</p>}

          <div className='space-y-2.5 text-sm'>
            <p className='flex items-start gap-2.5 text-slate-700'><Icon name='ri-translate-2' className='mt-0.5 text-slate-400' />Speaks {driver.languages.join(', ')}</p>
            <p className='flex items-start gap-2.5 text-slate-700'><Icon name='ri-car-line' className='mt-0.5 text-slate-400' />Drives {driver.vehicleTypes.map((t) => CAR_TYPES[t]).join(', ')} · {driver.transmissions.map((t) => TRANSMISSIONS[t]).join(' & ')}</p>
            <div className='flex flex-wrap gap-1.5 pt-1'>{driver.services.map((s) => <Badge key={s} tone='brand'>{BOOKING_TYPES[s]?.label}</Badge>)}</div>
          </div>

          <div>
            <p className='mb-1 text-[15px] font-bold text-slate-900'>Rates</p>
            <div className='divide-y divide-slate-100 rounded-xl border border-slate-200 px-4'>
              <Rate label='Hourly' amount={driver.rates.hourly} unit='/ hour' />
              <Rate label='Full day (8 hours)' amount={driver.rates.fullDay} unit='/ day' />
              <Rate label='Outstation & multi-day' amount={driver.rates.outstationPerDay} unit='/ day' />
            </div>
          </div>

          <div>
            <p className='mb-2 text-[15px] font-bold text-slate-900'>Reviews</p>
            {driver.reviews.length === 0 && <p className='rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500'>No reviews yet.</p>}
            <ul className='space-y-2'>
              {driver.reviews.map((review) => (
                <li key={review._id} className='rounded-xl bg-slate-50 p-3.5 text-sm'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-semibold text-slate-900'>{review.customerName || 'Customer'}</span>
                    <span className='text-xs text-slate-400'>{shortDate(review.createdAt)}</span>
                  </div>
                  <Stars value={review.rating} size='text-xs' />
                  {review.comment && <p className='mt-1 leading-relaxed text-slate-600'>{review.comment}</p>}
                </li>
              ))}
            </ul>
          </div>

          {onBook && <Button size='lg' className='sticky bottom-0 w-full shadow-lift' onClick={onBook}>Book {driver.fullname.firstname}</Button>}
        </div>
      )}
    </Modal>
  )
}
