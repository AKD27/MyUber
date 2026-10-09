import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { api, errorMessage } from '../../lib/api'
import { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS } from '../../lib/constants'
import { rupees, toIso, todayInput, durationLabel, rateLabel } from '../../lib/format'
import { useAuth } from '../../store/auth'
import AddressInput from '../../components/AddressInput'
import Avatar from '../../components/Avatar'
import DriverProfileModal from './DriverProfileModal'
import { Button, Card, EmptyState, ErrorNote, Field, Input, PageHeader, Select, Stars, Textarea, VerificationBadge } from '../../components/ui'
import { cx } from '../../lib/cx'

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
  if (v.date && v.time && new Date(`${v.date}T${v.time}`) < new Date(Date.now() - 5 * 60 * 1000)) {
    ctx.addIssue({ code: 'custom', path: ['time'], message: 'This time has already passed' })
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

const nextHour = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:00`
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
  vehicle: { type: v.vehicleType, transmission: v.transmission, model: v.model || undefined },
  notes: v.notes || undefined,
})

const SORTS = { recommended: 'Recommended', distance: 'Nearest', price: 'Lowest price', rating: 'Highest rated', experience: 'Most experienced' }

export default function BookDriver() {
  const navigate = useNavigate()
  const savedLocations = useAuth((state) => state.account?.savedLocations) || []
  const savedCar = loadSavedCar()
  const [request, setRequest] = useState(null)
  const [sort, setSort] = useState('recommended')
  const [language, setLanguage] = useState('')
  const [profileId, setProfileId] = useState(null)

  const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      bookingType: 'hourly', tripType: 'round_trip', pickup: null, destination: null,
      date: todayInput(), time: nextHour(), duration: BOOKING_TYPES.hourly.default,
      vehicleType: savedCar.vehicleType || 'sedan', transmission: savedCar.transmission || 'manual', model: savedCar.model || '', notes: '',
    },
  })

  const bookingType = watch('bookingType')
  const type = BOOKING_TYPES[bookingType]

  const search = useMutation({
    mutationFn: (body) => api.post('/drivers/search', body).then((res) => res.data),
  })

  const book = useMutation({
    mutationFn: (body) => api.post('/bookings', body).then((res) => res.data),
    onSuccess: (booking) => navigate(`/bookings/${booking._id}`),
  })

  const runSearch = (body) => {
    setRequest(body)
    search.mutate({ ...body, sort, filters: language ? { language } : undefined })
  }

  const onSubmit = (values) => {
    saveCar({ vehicleType: values.vehicleType, transmission: values.transmission, model: values.model })
    book.reset()
    runSearch(toRequest(values))
  }

  const changeSort = (value) => {
    setSort(value)
    if (request) search.mutate({ ...request, sort: value, filters: language ? { language } : undefined })
  }

  const applyLanguage = () => {
    if (request) search.mutate({ ...request, sort, filters: language ? { language } : undefined })
  }

  const chooseType = (key) => {
    setValue('bookingType', key)
    setValue('duration', BOOKING_TYPES[key].default)
    search.reset()
    setRequest(null)
  }

  const durations = Array.from({ length: type.max - type.min + 1 }, (_, i) => type.min + i)
  const results = search.data

  return (
    <div>
      <PageHeader title='Where do you need a driver?' subtitle='A verified driver will drive your own car.' />

      <div className='grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]'>
        <Card>
          <form className='space-y-4' onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <p className='mb-2 text-sm font-medium text-gray-700'>What do you need?</p>
              <div className='grid grid-cols-3 gap-2'>
                {Object.entries(BOOKING_TYPES).map(([key, t]) => (
                  <button key={key} type='button' onClick={() => chooseType(key)} aria-pressed={bookingType === key}
                    className={cx('flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs font-medium',
                      bookingType === key ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>
                    <i aria-hidden='true' className={`${t.icon} text-xl`} />{t.label}
                  </button>
                ))}
              </div>
            </div>

            {bookingType === 'outstation' && (
              <Field label='Trip'>
                <Select {...register('tripType')}>
                  <option value='round_trip'>Round trip</option>
                  <option value='one_way'>One way</option>
                </Select>
              </Field>
            )}

            <Field label='Pickup location' error={errors.pickup?.message}>
              <Controller control={control} name='pickup' render={({ field }) => (
                <AddressInput id='pickup' value={field.value} onChange={field.onChange} placeholder='Where should the driver come?' savedLocations={savedLocations} allowCurrentLocation />
              )} />
            </Field>

            {usesDestination(bookingType) && (
              <Field label={type.needsDestination ? 'Destination' : 'Destination (optional)'} error={errors.destination?.message}>
                <Controller control={control} name='destination' render={({ field }) => (
                  <AddressInput id='destination' value={field.value} onChange={field.onChange} placeholder={bookingType === 'airport' ? 'Airport or drop location' : 'Where are you going?'} savedLocations={savedLocations} />
                )} />
              </Field>
            )}

            <div className='grid grid-cols-2 gap-3'>
              <Field label='Date' error={errors.date?.message}><Input type='date' min={todayInput()} {...register('date')} /></Field>
              <Field label='Start time' error={errors.time?.message}><Input type='time' {...register('time')} /></Field>
            </div>

            <Field label='Duration' error={errors.duration?.message}>
              <Select {...register('duration')}>
                {durations.map((value) => <option key={value} value={value}>{durationLabel({ value, unit: type.unit })}</option>)}
              </Select>
            </Field>

            <fieldset className='rounded-lg border border-gray-200 p-3'>
              <legend className='px-1 text-sm font-medium text-gray-700'>Your car</legend>
              <div className='grid grid-cols-2 gap-3'>
                <Field label='Type'><Select {...register('vehicleType')}>{Object.entries(CAR_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                <Field label='Gears'><Select {...register('transmission')}>{Object.entries(TRANSMISSIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
              </div>
              <Field label='Model (optional)' className='mt-3'><Input placeholder='e.g. Toyota Fortuner' {...register('model')} /></Field>
            </fieldset>

            <Field label='Notes for the driver (optional)'><Textarea placeholder='Anything the driver should know' {...register('notes')} /></Field>

            <Button type='submit' variant='dark' className='w-full' loading={search.isPending}>
              <i aria-hidden='true' className='ri-search-line' /> Find available drivers
            </Button>
          </form>
        </Card>

        <div>
          {!request && (
            <EmptyState icon='ri-steering-2-line' title='Find a driver for your trip'>
              Fill in your trip details to see verified drivers who are free at that time.
            </EmptyState>
          )}

          {request && (
            <>
              <div className='mb-4 flex flex-wrap items-center gap-2'>
                <Select value={sort} onChange={(e) => changeSort(e.target.value)} className='w-auto' aria-label='Sort drivers'>
                  {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder='Language, e.g. Hindi' className='w-44' aria-label='Language' />
                <Button variant='secondary' onClick={applyLanguage}>Filter</Button>
              </div>

              {results?.routeEstimate && (
                <p className='mb-3 rounded-lg bg-white px-3 py-2 text-sm text-gray-700'>
                  <i aria-hidden='true' className='ri-route-line text-teal-700' /> About <b>{results.routeEstimate.distanceKm} km</b>, {Math.round(results.routeEstimate.durationMinutes / 60 * 10) / 10} hours of driving each way
                </p>
              )}

              <ErrorNote>{search.error && errorMessage(search.error)}</ErrorNote>
              <ErrorNote>{book.error && errorMessage(book.error)}</ErrorNote>

              {search.isPending && <p className='py-6 text-center text-sm text-gray-500'>Finding drivers…</p>}

              {results && !search.isPending && results.drivers.length === 0 && (
                <EmptyState icon='ri-user-search-line' title='No drivers available'>
                  No verified driver near this pickup is free at this time. Try another time, duration or car type.
                </EmptyState>
              )}

              <div className='space-y-3'>
                {results?.drivers.map((driver) => (
                  <Card key={driver._id} data-testid='driver-result'>
                    <div className='flex gap-3'>
                      <Avatar person={driver} />
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <p className='font-semibold'>{driver.fullname.firstname} {driver.fullname.lastname}</p>
                          {driver.verified && <VerificationBadge status='verified' />}
                        </div>
                        <p className='mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600'>
                          <Stars value={driver.rating.average} count={driver.rating.count} />
                          <span>{driver.experienceYears} yrs experience</span>
                          <span>{driver.distanceKm} km away</span>
                          <span>{driver.completedTrips} trips</span>
                        </p>
                        <p className='mt-1 text-xs text-gray-500'>Speaks {driver.languages.join(', ')}</p>
                      </div>
                      <div className='text-right'>
                        <p className='text-lg font-bold'>{rupees(driver.price.driverCharges)}</p>
                        <p className='text-xs text-gray-500'>{rateLabel(driver.price)}</p>
                      </div>
                    </div>
                    <div className='mt-3 flex gap-2'>
                      <Button variant='secondary' className='flex-1' onClick={() => setProfileId(driver._id)}>View profile</Button>
                      <Button className='flex-1' loading={book.isPending && book.variables?.driverId === driver._id}
                        onClick={() => book.mutate({ ...request, driverId: driver._id })}>Book driver</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <DriverProfileModal driverId={profileId} onClose={() => setProfileId(null)} />
    </div>
  )
}
