import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api, errorMessage } from '../../lib/api'
import { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS, STATUS } from '../../lib/constants'
import { rupees, toIso, todayInput, dateInput, durationLabel, rateLabel, friendlyDateTime, minutesLabel, kmLabel, bookingTypeLabel } from '../../lib/format'
import { inputPoint } from '../../lib/places'
import { useAuth } from '../../store/auth'
import { useRoute } from '../../hooks/useRoute'
import AddressInput from '../../components/AddressInput'
import Avatar from '../../components/Avatar'
import MapView from '../../components/MapView'
import MapShell from '../../components/MapShell'
import DriverProfileModal from './DriverProfileModal'
import { PriceBreakdown, RouteLine } from '../../components/BookingParts'
import { Button, Card, Chip, EmptyState, ErrorNote, Field, Icon, Input, ListSkeleton, Modal, Select, Stars, Textarea } from '../../components/ui'
import { cx } from '../../lib/cx'

const MAX_DAYS_AHEAD = 60

const place = z.object({ address: z.string().min(3), lat: z.number().optional(), lng: z.number().optional() })

const schema = z.object({
  bookingType: z.enum(Object.keys(BOOKING_TYPES)),
  tripType: z.enum(['one_way', 'round_trip']),
  pickup: place.nullable().refine(Boolean, 'Enter the pickup address'),
  destination: place.nullable().optional(),
  date: z.string().min(1, 'Choose a date'),
  time: z.string().min(1, 'Choose a time'),
  duration: z.coerce.number().int(),
  vehicleType: z.enum(Object.keys(CAR_TYPES)),
  transmission: z.enum(Object.keys(TRANSMISSIONS)),
  model: z.string().max(60).optional(),
  notes: z.string().max(500).optional(),
}).superRefine((v, ctx) => {
  if (BOOKING_TYPES[v.bookingType].needsDestination && !v.destination) {
    ctx.addIssue({ code: 'custom', path: ['destination'], message: 'Enter the destination' })
  }
  if (v.date && v.time) {
    const start = new Date(`${v.date}T${v.time}`)
    if (start < new Date(Date.now() - 5 * 60 * 1000)) ctx.addIssue({ code: 'custom', path: ['time'], message: 'This time has already passed' })
    if (start > new Date(Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000)) ctx.addIssue({ code: 'custom', path: ['date'], message: `Bookings open ${MAX_DAYS_AHEAD} days ahead` })
  }
})

// Remembering the car is a per-browser convenience; storage may be unavailable.
const SAVED_CAR_KEY = 'dod:lastCar'
const loadSavedCar = () => {
  try { return JSON.parse(localStorage.getItem(SAVED_CAR_KEY)) || {} } catch { return {} }
}
const saveCar = (car) => {
  try { localStorage.setItem(SAVED_CAR_KEY, JSON.stringify(car)) } catch { /* ignore */ }
}

// The default start: the next quarter hour that is at least 30 minutes away, with its date.
const QUARTER_MS = 15 * 60 * 1000
const defaultStart = () => {
  const d = new Date(Math.ceil((Date.now() + 2 * QUARTER_MS) / QUARTER_MS) * QUARTER_MS)
  return { date: dateInput(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
}

const usesDestination = (type) => BOOKING_TYPES[type].needsDestination || type === 'multi_day'

const toRequest = (v) => ({
  bookingType: v.bookingType,
  tripType: v.bookingType === 'outstation' ? v.tripType : undefined,
  pickup: v.pickup,
  // The destination field is hidden for types that don't use it, but may still hold an earlier value.
  destination: usesDestination(v.bookingType) && v.destination?.address ? v.destination : undefined,
  startTime: toIso(v.date, v.time),
  duration: v.duration,
  vehicle: { type: v.vehicleType, transmission: v.transmission, model: v.model?.trim() || undefined },
  notes: v.notes?.trim() || undefined,
})

const SORTS = {
  recommended: { label: 'Recommended', compare: (a, b) => b.rating.average - a.rating.average || a.distanceKm - b.distanceKm },
  distance: { label: 'Nearest first', compare: (a, b) => a.distanceKm - b.distanceKm },
  price: { label: 'Lowest price', compare: (a, b) => a.price.driverCharges - b.price.driverCharges },
  rating: { label: 'Highest rated', compare: (a, b) => b.rating.average - a.rating.average || b.rating.count - a.rating.count },
  experience: { label: 'Most experienced', compare: (a, b) => b.experienceYears - a.experienceYears },
}

function SectionLabel({ step, children }) {
  return (
    <p className='mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-slate-500'>
      <span className='flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white'>{step}</span>{children}
    </p>
  )
}

// A booking the customer already has running, so they can jump straight back to it.
function CurrentBooking() {
  const { data } = useQuery({
    queryKey: ['bookings', 'customer', 'current'],
    queryFn: async () => {
      const [active, upcoming] = await Promise.all(['active', 'upcoming'].map((scope) => api.get('/bookings', { params: { scope } }).then((res) => res.data)))
      return active[0] || upcoming[0] || null
    },
  })

  if (!data) return null

  return (
    <Link to={`/bookings/${data._id}`} className='mb-6 flex items-center gap-3.5 rounded-2xl bg-slate-900 p-4 text-white shadow-card transition hover:bg-slate-800'>
      <span className='relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xl text-brand-400'>
        <Icon name='ri-steering-2-fill' />
        <span className='absolute right-0 top-0 h-3 w-3 animate-pulse rounded-full bg-brand-400 ring-2 ring-slate-900' />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block truncate font-bold'>{STATUS[data.status].label} · {data.driver.fullname.firstname}</span>
        <span className='block truncate text-sm text-slate-400'>{bookingTypeLabel(data)} · {friendlyDateTime(data.startTime)}</span>
      </span>
      <span className='flex items-center gap-1 text-sm font-semibold text-brand-300'>View <Icon name='ri-arrow-right-line' /></span>
    </Link>
  )
}

function DriverResult({ driver, onProfile, onSelect }) {
  return (
    <Card data-testid='driver-result' className='duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift'>
      <div className='flex gap-3.5'>
        <Avatar person={driver} size='h-14 w-14' />
        <div className='min-w-0 flex-1'>
          <p className='flex items-center gap-1.5 font-bold text-slate-900'>
            <span className='truncate'>{driver.fullname.firstname} {driver.fullname.lastname}</span>
            {driver.verified && <Icon name='ri-verified-badge-fill' className='text-brand-600' />}
          </p>
          <p className='mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-slate-500'>
            <Stars value={driver.rating.average} count={driver.rating.count} size='text-[13px]' />
            <span>{driver.experienceYears} yrs exp</span>
            <span>{driver.completedTrips.toLocaleString('en-IN')} trips</span>
          </p>
        </div>
        <div className='text-right'>
          <p className='tabular text-xl font-extrabold tracking-tight text-slate-900'>{rupees(driver.price.driverCharges)}</p>
          <p className='text-xs text-slate-500'>{rateLabel(driver.price)}</p>
        </div>
      </div>
      <div className='mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-slate-600'>
        <span className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1'><Icon name='ri-map-pin-2-line' />{kmLabel(driver.distanceKm)} away</span>
        <span className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1'><Icon name='ri-translate-2' />{driver.languages.join(', ')}</span>
      </div>
      <div className='mt-4 flex gap-2'>
        <Button variant='secondary' className='flex-1' onClick={onProfile}>View profile</Button>
        <Button className='flex-1' onClick={onSelect}>Book driver</Button>
      </div>
    </Card>
  )
}

export default function BookDriver() {
  const navigate = useNavigate()
  const account = useAuth((state) => state.account)
  const savedLocations = account?.savedLocations || []
  const savedCar = useMemo(loadSavedCar, [])
  const resultsRef = useRef(null)
  // What the map shows before a pickup is chosen: the customer's first saved place, else New Delhi.
  const home = savedLocations[0]?.place.location.coordinates
  const mapCenter = home ? { lat: home[1], lng: home[0] } : { lat: 28.6139, lng: 77.209 }

  const [request, setRequest] = useState(null)
  const [sort, setSort] = useState('recommended')
  const [filters, setFilters] = useState({ topRated: false, experienced: false, language: '' })
  const [profileId, setProfileId] = useState(null)
  const [chosen, setChosen] = useState(null)

  const start = useMemo(defaultStart, [])
  const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      bookingType: 'hourly', tripType: 'round_trip', pickup: null, destination: null,
      date: start.date, time: start.time, duration: BOOKING_TYPES.hourly.default,
      vehicleType: savedCar.vehicleType || 'sedan', transmission: savedCar.transmission || 'manual', model: savedCar.model || '', notes: '',
    },
  })

  const [bookingType, pickup, destination, vehicleType, transmission] = watch(['bookingType', 'pickup', 'destination', 'vehicleType', 'transmission'])
  const type = BOOKING_TYPES[bookingType]
  const showDestination = usesDestination(bookingType)

  const pickupPoint = inputPoint(pickup, 'Pickup', 'pickup')
  const destinationPoint = showDestination ? inputPoint(destination, 'Destination', 'destination') : null
  const route = useRoute(pickupPoint, destinationPoint)

  const search = useMutation({
    mutationFn: (body) => api.post('/drivers/search', body).then((res) => res.data),
  })

  const book = useMutation({
    mutationFn: (body) => api.post('/bookings', body).then((res) => res.data),
    onSuccess: (booking) => navigate(`/bookings/${booking._id}`),
  })

  const onSubmit = (values) => {
    saveCar({ vehicleType: values.vehicleType, transmission: values.transmission, model: values.model })
    const body = toRequest(values)
    book.reset()
    setFilters({ topRated: false, experienced: false, language: '' })
    setRequest(body)
    search.mutate(body)
  }

  const chooseType = (key) => {
    setValue('bookingType', key)
    setValue('duration', BOOKING_TYPES[key].default)
    search.reset()
    setRequest(null)
  }

  const closeConfirm = () => {
    setChosen(null)
    book.reset()
  }

  const durations = Array.from({ length: type.max - type.min + 1 }, (_, i) => type.min + i)
  const results = search.data

  const languages = useMemo(() => [...new Set((results?.drivers || []).flatMap((d) => d.languages))].sort(), [results])
  const drivers = useMemo(() => (results?.drivers || [])
    .filter((d) => (!filters.topRated || d.rating.average >= 4.5)
      && (!filters.experienced || d.experienceYears >= 5)
      && (!filters.language || d.languages.includes(filters.language)))
    .sort(SORTS[sort].compare), [results, filters, sort])

  const maxDate = dateInput(new Date(Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000))

  return (
    <>
      <MapShell map={<MapView fill center={mapCenter} points={[pickupPoint, destinationPoint]} path={route?.path} />}>
        {route && (
          <p className='mb-4 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-300'>
            <Icon name='ri-route-line' className='text-lg text-brand-400' />
            <span><b className='text-white'>{kmLabel(route.distanceKm)}</b> · about <b className='text-white'>{minutesLabel(route.durationMinutes)}</b> of driving each way</span>
          </p>
        )}

        {!request && (
          <div>
            <CurrentBooking />
            <h1 className='text-[26px] font-extrabold leading-tight text-slate-900'>Where do you need a driver?</h1>
            <p className='mb-5 mt-1 text-sm text-slate-500'>A verified driver comes to you and drives your own car.</p>
          <form className='space-y-6' onSubmit={handleSubmit(onSubmit)} noValidate>
            <section>
              <SectionLabel step={1}>What do you need?</SectionLabel>
              <div className='grid grid-cols-3 gap-2'>
                {Object.entries(BOOKING_TYPES).map(([key, t]) => (
                  <button key={key} type='button' onClick={() => chooseType(key)} aria-pressed={bookingType === key}
                    className={cx('group flex flex-col items-center gap-2 rounded-2xl px-1.5 py-3 text-center text-xs font-semibold ring-1 ring-inset transition duration-200 active:scale-95',
                      bookingType === key ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                    <span className={cx('flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-transform duration-200 group-hover:scale-110', bookingType === key ? 'scale-110 bg-white/15 text-white' : t.tint)}><Icon name={t.icon} /></span>{t.label}
                  </button>
                ))}
              </div>
              <p className='mt-2 text-xs text-slate-500'>{type.hint}</p>

              {bookingType === 'outstation' && (
                <Controller control={control} name='tripType' render={({ field }) => (
                  <div className='mt-3 grid grid-cols-2 gap-2' role='radiogroup' aria-label='Trip'>
                    {[['round_trip', 'Round trip', 'ri-repeat-line'], ['one_way', 'One way', 'ri-arrow-right-line']].map(([value, label, icon]) => (
                      <button key={value} type='button' role='radio' aria-checked={field.value === value} onClick={() => field.onChange(value)}
                        className={cx('flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ring-1 ring-inset transition',
                          field.value === value ? 'bg-brand-50 text-brand-800 ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
                        <Icon name={icon} />{label}
                      </button>
                    ))}
                  </div>
                )} />
              )}
            </section>

            <section className='space-y-3'>
              <SectionLabel step={2}>Where?</SectionLabel>
              <Field label='Pickup location' error={errors.pickup?.message}>
                <Controller control={control} name='pickup' render={({ field }) => (
                  <AddressInput id='pickup' value={field.value} onChange={field.onChange} placeholder='Where should the driver come?' savedLocations={savedLocations} allowCurrentLocation
                    icon='ri-record-circle-fill' iconClass='text-emerald-600' invalid={Boolean(errors.pickup)} />
                )} />
              </Field>

              {showDestination && (
                <Field label='Destination' optional={!type.needsDestination} error={errors.destination?.message}>
                  <Controller control={control} name='destination' render={({ field }) => (
                    <AddressInput id='destination' value={field.value} onChange={field.onChange} placeholder={bookingType === 'airport' ? 'Airport or drop location' : 'Where are you going?'} savedLocations={savedLocations}
                      icon='ri-stop-fill' iconClass='text-slate-900' invalid={Boolean(errors.destination)} />
                  )} />
                </Field>
              )}
            </section>

            <section>
              <SectionLabel step={3}>When?</SectionLabel>
              <div className='grid grid-cols-2 gap-3'>
                <Field label='Date' error={errors.date?.message}><Input type='date' min={todayInput()} max={maxDate} aria-invalid={Boolean(errors.date)} {...register('date')} /></Field>
                <Field label='Start time' error={errors.time?.message}><Input type='time' step={900} aria-invalid={Boolean(errors.time)} {...register('time')} /></Field>
              </div>
              <Field label='Duration' className='mt-3' error={errors.duration?.message}>
                <Select {...register('duration')}>
                  {durations.map((value) => <option key={value} value={value}>{durationLabel({ value, unit: type.unit })}</option>)}
                </Select>
              </Field>
            </section>

            <section>
              <SectionLabel step={4}>Your car</SectionLabel>
              <div className='scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5' role='radiogroup' aria-label='Car type'>
                {Object.entries(CAR_TYPES).map(([key, label]) => (
                  <Chip key={key} selected={vehicleType === key} onClick={() => setValue('vehicleType', key)}>{label}</Chip>
                ))}
              </div>
              <div className='mt-3 grid grid-cols-[auto_1fr] gap-3'>
                <div className='flex rounded-xl bg-slate-100 p-1' role='radiogroup' aria-label='Gears'>
                  {Object.entries(TRANSMISSIONS).map(([key, label]) => (
                    <button key={key} type='button' role='radio' aria-checked={transmission === key} onClick={() => setValue('transmission', key)}
                      className={cx('rounded-lg px-3 text-[13px] font-semibold transition', transmission === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>{label}</button>
                  ))}
                </div>
                <Input placeholder='Model, e.g. Toyota Fortuner' aria-label='Car model' maxLength={60} {...register('model')} />
              </div>
              <Field label='Notes for the driver' optional className='mt-3'>
                <Textarea placeholder='Luggage, elderly passengers, stops on the way…' maxLength={500} className='min-h-[72px]' {...register('notes')} />
              </Field>
            </section>

            <Button type='submit' size='lg' className='w-full' loading={search.isPending}>
              <Icon name='ri-search-line' /> Find available drivers
            </Button>
          </form>
          </div>
        )}

        {request && (
          <div ref={resultsRef} className='space-y-4'>
            <button type='button' onClick={() => { setRequest(null); search.reset() }}
              className='flex w-full items-center gap-3 rounded-2xl bg-slate-100 p-3 text-left transition-colors hover:bg-slate-200/70'>
              <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg text-slate-700 shadow-sm'><Icon name='ri-arrow-left-line' /></span>
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-bold text-slate-900'>{bookingTypeLabel(request)} · {durationLabel({ value: request.duration, unit: type.unit })} · {friendlyDateTime(request.startTime)}</span>
                <span className='block truncate text-xs text-slate-500'>{request.pickup.address}</span>
              </span>
              <span className='text-xs font-bold text-brand-700'>Edit</span>
            </button>

            {request && search.isPending && <ListSkeleton />}
            {request && <ErrorNote>{search.error && errorMessage(search.error)}</ErrorNote>}

            {request && results && !search.isPending && results.drivers.length === 0 && (
              <EmptyState icon='ri-user-search-line' title='No drivers available'>
                No verified driver near this pickup is free at this time for this car. Try another time, a shorter duration or a different pickup.
              </EmptyState>
            )}

            {request && results?.drivers.length > 0 && !search.isPending && (
              <>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <h2 className='text-lg font-extrabold text-slate-900'>{drivers.length} {drivers.length === 1 ? 'driver' : 'drivers'} available</h2>
                  <Select value={sort} onChange={(e) => setSort(e.target.value)} className='h-9 w-auto rounded-full text-[13px] font-semibold' aria-label='Sort drivers'>
                    {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
                  </Select>
                </div>
                <div className='scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5'>
                  <Chip icon='ri-star-fill' selected={filters.topRated} onClick={() => setFilters({ ...filters, topRated: !filters.topRated })}>4.5 & above</Chip>
                  <Chip icon='ri-medal-line' selected={filters.experienced} onClick={() => setFilters({ ...filters, experienced: !filters.experienced })}>5+ years</Chip>
                  {languages.map((language) => (
                    <Chip key={language} selected={filters.language === language} onClick={() => setFilters({ ...filters, language: filters.language === language ? '' : language })}>{language}</Chip>
                  ))}
                </div>

                {drivers.length === 0 && <EmptyState icon='ri-filter-off-line' title='No drivers match these filters' action={<Button variant='secondary' onClick={() => setFilters({ topRated: false, experienced: false, language: '' })}>Clear filters</Button>} />}

                <div className='stagger space-y-3'>
                  {drivers.map((driver) => (
                    <DriverResult key={driver._id} driver={driver} onProfile={() => setProfileId(driver._id)} onSelect={() => setChosen(driver)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </MapShell>

      <DriverProfileModal driverId={profileId} onClose={() => setProfileId(null)}
        onBook={results?.drivers.some((d) => d._id === profileId) ? () => { setChosen(results.drivers.find((d) => d._id === profileId)); setProfileId(null) } : undefined} />

      <Modal open={Boolean(chosen)} onClose={closeConfirm} title='Confirm your booking'>
        {chosen && request && (
          <div className='space-y-5'>
            <div className='flex items-center gap-3'>
              <Avatar person={chosen} />
              <div className='min-w-0 flex-1'>
                <p className='flex items-center gap-1.5 font-bold text-slate-900'>{chosen.fullname.firstname} {chosen.fullname.lastname} {chosen.verified && <Icon name='ri-verified-badge-fill' className='text-brand-600' />}</p>
                <p className='text-[13px] text-slate-500'><Stars value={chosen.rating.average} count={chosen.rating.count} size='text-[13px]' /> · {chosen.experienceYears} yrs experience</p>
              </div>
            </div>

            <div className='space-y-4 rounded-2xl bg-slate-50 p-4'>
              <RouteLine pickup={request.pickup} destination={request.destination} />
              <dl className='grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-sm'>
                <div><dt className='text-xs text-slate-500'>Booking</dt><dd className='font-semibold text-slate-900'>{bookingTypeLabel(request)}</dd></div>
                <div><dt className='text-xs text-slate-500'>Duration</dt><dd className='font-semibold text-slate-900'>{durationLabel(results.duration)}</dd></div>
                <div><dt className='text-xs text-slate-500'>Starts</dt><dd className='font-semibold text-slate-900'>{friendlyDateTime(results.startTime)}</dd></div>
                <div><dt className='text-xs text-slate-500'>Car</dt><dd className='font-semibold text-slate-900'>{request.vehicle.model || CAR_TYPES[request.vehicle.type]} · {TRANSMISSIONS[request.vehicle.transmission]}</dd></div>
              </dl>
            </div>

            <PriceBreakdown pricing={chosen.price} />
            <ErrorNote>{book.error && errorMessage(book.error)}</ErrorNote>

            <div className='flex gap-2'>
              <Button variant='secondary' size='lg' className='flex-1' onClick={closeConfirm}>Back</Button>
              <Button variant='brand' size='lg' className='flex-[2]' loading={book.isPending} onClick={() => book.mutate({ ...request, driverId: chosen._id })}>Send request</Button>
            </div>
            <p className='text-center text-xs text-slate-500'>{chosen.fullname.firstname} has a few minutes to accept. You can cancel free of charge before the trip starts.</p>
          </div>
        )}
      </Modal>
    </>
  )
}
