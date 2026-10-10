import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { STATUS, CAR_TYPES, TRANSMISSIONS } from '../../lib/constants'
import { friendlyDateTime, timeAgo } from '../../lib/format'
import { placePoint } from '../../lib/places'
import Avatar from '../../components/Avatar'
import MapView from '../../components/MapView'
import { Logo } from '../../components/Layout'
import { RouteLine } from '../../components/BookingParts'
import { Card, EmptyState, Icon, Spinner, Stars, StatusBadge } from '../../components/ui'

const REFRESH_MS = 10 * 1000

// The public, read-only page behind a shared trip link. No login; it refreshes itself.
export default function TrackTrip() {
  const { token } = useParams()

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['shared-trip', token],
    queryFn: () => api.get(`/bookings/shared/${token}`).then((res) => res.data),
    refetchInterval: (query) => (query.state.data?.active ? REFRESH_MS : false),
    retry: false,
  })

  const driver = trip?.driver
  const points = trip?.active ? [
    placePoint(trip.pickup, 'Pickup', 'pickup'),
    placePoint(trip.destination, 'Destination', 'destination'),
    trip.driverLocation && { ...trip.driverLocation, label: driver.fullname.firstname, kind: 'driver' },
  ].filter(Boolean) : []

  return (
    <div className='min-h-dvh bg-slate-50'>
      <header className='border-b border-slate-200/80 bg-white'>
        <div className='mx-auto flex h-16 max-w-2xl items-center justify-between px-4'>
          <Logo />
          <span className='flex items-center gap-1.5 text-xs font-semibold text-slate-500'><Icon name='ri-eye-line' />Shared trip</span>
        </div>
      </header>

      <main className='mx-auto max-w-2xl space-y-4 px-4 py-6'>
        {isLoading && <Spinner />}

        {error && (
          <EmptyState icon='ri-link-unlink-m' title='This link is not valid'>Ask the person who shared it to send the trip link again.</EmptyState>
        )}

        {trip && !trip.active && (
          <EmptyState icon='ri-flag-2-line' title={`${trip.customerName || 'This'}${trip.customerName ? '’s' : ''} trip has ended`}>
            Status: {STATUS[trip.status]?.label || trip.status}. Live tracking is only available during the trip.
          </EmptyState>
        )}

        {trip?.active && (
          <>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <h1 className='text-2xl font-extrabold tracking-tight text-slate-900'>{trip.customerName}’s trip</h1>
              <StatusBadge status={trip.status} />
            </div>

            <MapView points={points} className='h-72 sm:h-96' />
            <p className='flex items-center gap-1.5 text-xs text-slate-500'>
              <Icon name='ri-refresh-line' />
              {trip.driverLocation ? `Driver's position updated ${timeAgo(trip.driverLocation.updatedAt).toLowerCase()}. This page refreshes on its own.` : 'The driver’s position appears here once they set off.'}
            </p>

            <Card>
              <div className='flex items-center gap-3'>
                <Avatar person={driver} />
                <div className='min-w-0 flex-1'>
                  <p className='flex items-center gap-1.5 font-bold text-slate-900'>{driver.fullname.firstname} {driver.fullname.lastname} <Icon name='ri-verified-badge-fill' className='text-brand-600' /></p>
                  <p className='text-sm text-slate-500'>Verified driver · <Stars value={driver.rating?.average} count={driver.rating?.count} /></p>
                </div>
              </div>
              <p className='mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600'>
                <Icon name='ri-car-line' className='text-slate-400' />
                Driving {trip.customerName}’s {trip.vehicle.model || CAR_TYPES[trip.vehicle.type]} ({TRANSMISSIONS[trip.vehicle.transmission].toLowerCase()})
              </p>
            </Card>

            <Card>
              <RouteLine pickup={trip.pickup} destination={trip.destination} />
              <p className='mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600'>
                {trip.tripStartedAt ? `Trip started ${friendlyDateTime(trip.tripStartedAt)}` : `Booked from ${friendlyDateTime(trip.startTime)}`} · until {friendlyDateTime(trip.endTime)}
              </p>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
