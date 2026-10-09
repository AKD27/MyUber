import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS } from '../../lib/constants'
import { rupees, shortDate } from '../../lib/format'
import Avatar from '../../components/Avatar'
import { ErrorNote, Modal, Spinner, Stars, VerificationBadge, Badge } from '../../components/ui'

export default function DriverProfileModal({ driverId, onClose }) {
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
        <div className='space-y-4'>
          <div className='flex items-center gap-3'>
            <Avatar person={driver} size='h-16 w-16' />
            <div>
              <p className='text-lg font-bold'>{driver.fullname.firstname} {driver.fullname.lastname}</p>
              <div className='flex flex-wrap items-center gap-2'>
                <Stars value={driver.rating.average} count={driver.rating.count} />
                {driver.verified && <VerificationBadge status='verified' />}
              </div>
            </div>
          </div>

          <div className='grid grid-cols-3 gap-2 text-center'>
            <div className='rounded-lg bg-gray-50 p-2'><p className='font-bold'>{driver.experienceYears} yrs</p><p className='text-xs text-gray-500'>Experience</p></div>
            <div className='rounded-lg bg-gray-50 p-2'><p className='font-bold'>{driver.completedTrips}</p><p className='text-xs text-gray-500'>Trips</p></div>
            <div className='rounded-lg bg-gray-50 p-2'><p className='font-bold'>{driver.cancellationRate}%</p><p className='text-xs text-gray-500'>Cancellations</p></div>
          </div>

          {driver.about && <p className='text-sm text-gray-700'>{driver.about}</p>}

          <div className='space-y-2 text-sm'>
            <p><span className='text-gray-500'>Languages:</span> {driver.languages.join(', ')}</p>
            <p><span className='text-gray-500'>Drives:</span> {driver.vehicleTypes.map((t) => CAR_TYPES[t]).join(', ')} · {driver.transmissions.map((t) => TRANSMISSIONS[t]).join(' & ')}</p>
            <div className='flex flex-wrap gap-1'>{driver.services.map((s) => <Badge key={s} tone='teal'>{BOOKING_TYPES[s]?.label}</Badge>)}</div>
          </div>

          <div className='rounded-lg border border-gray-200 p-3 text-sm'>
            <p className='mb-1 font-semibold'>Rates</p>
            {driver.rates.hourly && <p>{rupees(driver.rates.hourly)} / hour</p>}
            {driver.rates.fullDay && <p>{rupees(driver.rates.fullDay)} / day (8 hours)</p>}
            {driver.rates.outstationPerDay && <p>{rupees(driver.rates.outstationPerDay)} / day outstation</p>}
          </div>

          <div>
            <p className='mb-2 font-semibold'>Reviews</p>
            {driver.reviews.length === 0 && <p className='text-sm text-gray-500'>No reviews yet.</p>}
            <ul className='space-y-2'>
              {driver.reviews.map((review) => (
                <li key={review._id} className='rounded-lg bg-gray-50 p-3 text-sm'>
                  <div className='flex justify-between'><Stars value={review.rating} /><span className='text-xs text-gray-500'>{review.customerName} · {shortDate(review.createdAt)}</span></div>
                  {review.comment && <p className='mt-1 text-gray-700'>{review.comment}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  )
}
