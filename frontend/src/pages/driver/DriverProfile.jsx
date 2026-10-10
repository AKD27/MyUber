import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api, errorMessage } from '../../lib/api'
import { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS, WEEKDAYS } from '../../lib/constants'
import { phone } from '../../lib/schemas'
import { useAuth } from '../../store/auth'
import { toast } from '../../store/toast'
import AddressInput from '../../components/AddressInput'
import Avatar from '../../components/Avatar'
import { Button, Card, ErrorNote, Field, Icon, Input, Note, PageHeader, SectionTitle, Spinner, Textarea, Toggle, VerificationBadge } from '../../components/ui'
import { cx } from '../../lib/cx'

// Empty number inputs mean "not set".
const optionalNumber = (schema) => z.preprocess((v) => (v === '' || v === null || Number.isNaN(v) ? undefined : Number(v)), schema.optional())
const rate = optionalNumber(z.number({ invalid_type_error: 'Enter a number' }).int('Whole rupees only').min(50, 'At least ₹50').max(100000, 'Too high'))

const schema = z.object({
  firstname: z.string().trim().min(2, 'Enter your first name'),
  lastname: z.string().trim().optional(),
  phone,
  about: z.string().max(1000).optional(),
  experienceYears: optionalNumber(z.number().int().min(0, 'Cannot be negative').max(60, 'Check this number')),
  languages: z.string().optional(),
  services: z.array(z.string()).default([]),
  vehicleTypes: z.array(z.string()).default([]),
  transmissions: z.array(z.string()).default([]),
  hourly: rate,
  fullDay: rate,
  outstationPerDay: rate,
  serviceRadiusKm: optionalNumber(z.number().int().min(1, 'At least 1 km').max(100, 'At most 100 km')),
  workingEnabled: z.boolean().default(false),
  workingDays: z.array(z.number()).default([]),
  workingStart: z.string().default('06:00'),
  workingEnd: z.string().default('22:00'),
  address: z.string().trim().optional(),
  licenceNumber: z.string().trim().optional(),
  licenceExpiry: z.string().optional(),
  emergencyName: z.string().trim().optional(),
  emergencyPhone: phone.or(z.literal('')).optional(),
  baseLocation: z.any().optional(),
}).superRefine((v, ctx) => {
  if (v.address && v.address.length < 5) ctx.addIssue({ code: 'custom', path: ['address'], message: 'Enter your full address' })
  if (v.licenceNumber && v.licenceNumber.length < 5) ctx.addIssue({ code: 'custom', path: ['licenceNumber'], message: 'Enter the full licence number' })
  if (Boolean(v.licenceNumber) !== Boolean(v.licenceExpiry)) ctx.addIssue({ code: 'custom', path: [v.licenceNumber ? 'licenceExpiry' : 'licenceNumber'], message: 'Enter both the number and the expiry date' })
  if (Boolean(v.emergencyName) !== Boolean(v.emergencyPhone)) ctx.addIssue({ code: 'custom', path: [v.emergencyName ? 'emergencyPhone' : 'emergencyName'], message: 'Enter both a name and a phone number' })
  if (v.workingEnabled && v.workingDays.length === 0) ctx.addIssue({ code: 'custom', path: ['workingDays'], message: 'Choose at least one working day' })
  if (v.workingEnabled && v.workingStart >= v.workingEnd) ctx.addIssue({ code: 'custom', path: ['workingEnd'], message: 'Must be after the start time' })
})

const toForm = (d) => ({
  firstname: d.fullname.firstname,
  lastname: d.fullname.lastname || '',
  phone: d.phone,
  about: d.about || '',
  experienceYears: d.experienceYears ?? '',
  languages: (d.languages || []).join(', '),
  services: d.services || [],
  vehicleTypes: d.vehicleTypes || [],
  transmissions: d.transmissions || [],
  hourly: d.rates?.hourly ?? '',
  fullDay: d.rates?.fullDay ?? '',
  outstationPerDay: d.rates?.outstationPerDay ?? '',
  serviceRadiusKm: d.serviceRadiusKm ?? 15,
  workingEnabled: d.workingHours?.enabled || false,
  workingDays: d.workingHours?.days || [0, 1, 2, 3, 4, 5, 6],
  workingStart: d.workingHours?.start || '06:00',
  workingEnd: d.workingHours?.end || '22:00',
  address: d.address || '',
  licenceNumber: d.licence?.number || '',
  licenceExpiry: d.licence?.expiry ? d.licence.expiry.slice(0, 10) : '',
  emergencyName: d.emergencyContact?.name || '',
  emergencyPhone: d.emergencyContact?.phone || '',
  baseLocation: d.location?.coordinates ? { address: 'Saved base location', lat: d.location.coordinates[1], lng: d.location.coordinates[0] } : null,
})

// Only send what is filled in; the server keeps the rest.
const toRequest = (v, original) => {
  const body = {
    fullname: { firstname: v.firstname, lastname: v.lastname || undefined },
    phone: v.phone,
    about: v.about?.trim() || undefined,
    experienceYears: v.experienceYears,
    languages: v.languages ? v.languages.split(',').map((l) => l.trim()).filter(Boolean) : undefined,
    services: v.services,
    vehicleTypes: v.vehicleTypes,
    transmissions: v.transmissions,
    rates: { hourly: v.hourly, fullDay: v.fullDay, outstationPerDay: v.outstationPerDay },
    serviceRadiusKm: v.serviceRadiusKm,
    address: v.address || undefined,
  }
  // The server needs valid days and times even while the switch is off.
  if (v.workingDays.length > 0 && v.workingStart < v.workingEnd) {
    body.workingHours = { enabled: v.workingEnabled, days: [...v.workingDays].sort(), start: v.workingStart, end: v.workingEnd }
  }
  if (v.licenceNumber && v.licenceExpiry) body.licence = { number: v.licenceNumber, expiry: v.licenceExpiry }
  if (v.emergencyName && v.emergencyPhone) body.emergencyContact = { name: v.emergencyName, phone: v.emergencyPhone }
  // Only send a newly picked location, not the placeholder for the saved one.
  const saved = original.baseLocation
  const unchanged = saved && v.baseLocation?.lat === saved.lat && v.baseLocation?.lng === saved.lng
  if (v.baseLocation?.address && !unchanged) body.baseLocation = v.baseLocation
  return body
}

// Tick boxes shown as pills.
function CheckboxGroup({ options, register, name }) {
  return (
    <div className='flex flex-wrap gap-2'>
      {Object.entries(options).map(([value, label]) => (
        <label key={value} className='flex h-9 cursor-pointer select-none items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 has-[:checked]:bg-slate-900 has-[:checked]:text-white has-[:checked]:ring-slate-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600'>
          <input type='checkbox' value={value} {...register(name)} className='sr-only' />
          {label.icon && <Icon name={label.icon} />}
          {typeof label === 'string' ? label : label.label}
        </label>
      ))}
    </div>
  )
}

const STATUS_NOTES = {
  pending: 'Fill in the sections below, save, then submit your profile for verification.',
  under_review: 'Our team is reviewing your details. You will be notified here as soon as they decide.',
  verified: 'You are verified. Go online from your home screen to receive bookings.',
  rejected: 'Your profile was not approved. Fix what the note says, save, and submit again.',
}

function PhotoUpload({ account, onUploaded }) {
  const input = useRef(null)

  const upload = useMutation({
    mutationFn: (file) => {
      const data = new FormData()
      data.append('photo', file)
      return api.post('/drivers/me/photo', data).then((res) => res.data)
    },
    onSuccess: (data) => onUploaded(data, 'Photo updated'),
    onError: (error) => toast(errorMessage(error), 'error'),
  })

  const onChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 3 * 1024 * 1024) return toast('The photo must be smaller than 3 MB', 'error')
    upload.mutate(file)
  }

  return (
    <div className='flex items-center gap-4'>
      <div className='relative'>
        <Avatar person={account} size='h-20 w-20' className='text-2xl' />
        {upload.isPending && <span className='absolute inset-0 flex items-center justify-center rounded-full bg-white/70 text-xl text-brand-700'><Icon name='ri-loader-4-line animate-spin' /></span>}
      </div>
      <div>
        <input ref={input} type='file' accept='image/jpeg,image/png,image/webp' onChange={onChange} className='sr-only' aria-label='Profile photo' tabIndex={-1} />
        <Button variant='secondary' size='sm' disabled={upload.isPending} onClick={() => input.current?.click()}><Icon name='ri-camera-line' />{account.profilePhotoUrl ? 'Change photo' : 'Upload photo'}</Button>
        <p className='mt-1.5 text-xs text-slate-500'>A clear photo of your face. JPG, PNG or WebP, up to 3 MB.</p>
      </div>
    </div>
  )
}

export default function DriverProfile() {
  const queryClient = useQueryClient()
  const setAccount = useAuth((state) => state.setAccount)

  const profile = useQuery({ queryKey: ['driver-profile'], queryFn: () => api.get('/drivers/me').then((res) => res.data) })
  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isDirty } } = useForm({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (profile.data) reset(toForm(profile.data.account))
  }, [profile.data, reset])

  const onSaved = (data, message) => {
    queryClient.setQueryData(['driver-profile'], data)
    queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] })
    setAccount(data.account)
    toast(message, 'success')
  }

  const save = useMutation({
    mutationFn: (values) => api.patch('/drivers/me', toRequest(values, toForm(profile.data.account))).then((res) => res.data),
    onSuccess: (data) => onSaved(data, 'Profile saved'),
  })

  const submit = useMutation({
    mutationFn: () => api.post('/drivers/me/submit-verification').then((res) => res.data),
    onSuccess: (data) => onSaved(data, 'Submitted for verification'),
  })

  if (profile.isLoading) return <Spinner />
  if (profile.error) return <ErrorNote>{errorMessage(profile.error)}</ErrorNote>

  const { account, missingFields } = profile.data
  const verification = account.verification
  const canSubmit = ['pending', 'rejected'].includes(verification.status)
  const [workingEnabled, workingDays = []] = watch(['workingEnabled', 'workingDays'])

  const toggleDay = (day) => setValue('workingDays', workingDays.includes(day) ? workingDays.filter((d) => d !== day) : [...workingDays, day], { shouldDirty: true })

  return (
    <div className='mx-auto max-w-3xl space-y-5'>
      <PageHeader title='Driver profile' subtitle='Customers see your photo, name, experience, languages, services, rates and reviews.' />

      <Card className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <SectionTitle className='!mb-0'>Verification</SectionTitle>
          <VerificationBadge status={verification.status} />
        </div>
        <p className='text-sm text-slate-600'>{STATUS_NOTES[verification.status]}</p>
        {verification.status === 'rejected' && verification.note && <Note tone='red' icon='ri-chat-quote-fill'><b>Note from our team:</b> {verification.note}</Note>}
        {canSubmit && missingFields.length > 0 && (
          <Note tone='amber' icon='ri-list-check-3'>
            <b>Still needed:</b>
            <ul className='mt-1 list-inside list-disc space-y-0.5'>{missingFields.map((field) => <li key={field} className='first-letter:uppercase'>{field}</li>)}</ul>
          </Note>
        )}
        {canSubmit && (
          <div className='flex flex-wrap items-center gap-3'>
            <Button variant='brand' onClick={() => submit.mutate()} disabled={missingFields.length > 0 || isDirty} loading={submit.isPending}><Icon name='ri-send-plane-fill' />Submit for verification</Button>
            {isDirty && <span className='text-xs font-medium text-amber-700'>Save your changes first.</span>}
          </div>
        )}
        <ErrorNote>{submit.error && errorMessage(submit.error)}</ErrorNote>
      </Card>

      <form className='space-y-5' onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <Card className='space-y-4'>
          <SectionTitle>About you</SectionTitle>
          <PhotoUpload account={account} onUploaded={onSaved} />
          <div className='grid gap-3 sm:grid-cols-2'>
            <Field label='First name' error={errors.firstname?.message}><Input autoComplete='given-name' {...register('firstname')} /></Field>
            <Field label='Last name'><Input autoComplete='family-name' {...register('lastname')} /></Field>
            <Field label='Mobile number' error={errors.phone?.message}><Input type='tel' inputMode='tel' {...register('phone')} /></Field>
            <Field label='Driving experience (years)' error={errors.experienceYears?.message}><Input type='number' inputMode='numeric' min={0} max={60} {...register('experienceYears')} /></Field>
          </div>
          <Field label='Languages you speak' hint='Separate with commas, e.g. Hindi, English'><Input {...register('languages')} /></Field>
          <Field label='About you' optional><Textarea maxLength={1000} {...register('about')} placeholder='Your driving background, routes you know well, the cars you have driven…' /></Field>
        </Card>

        <Card className='space-y-4'>
          <SectionTitle>Services and rates</SectionTitle>
          <Field group label='Services you offer'><CheckboxGroup options={BOOKING_TYPES} register={register} name='services' /></Field>
          <Field group label='Cars you can drive'><CheckboxGroup options={CAR_TYPES} register={register} name='vehicleTypes' /></Field>
          <Field group label='Gears'><CheckboxGroup options={TRANSMISSIONS} register={register} name='transmissions' /></Field>
          <div className='grid gap-3 sm:grid-cols-3'>
            <Field label='Hourly rate (₹)' error={errors.hourly?.message} hint='Hourly, airport and extra hours'><Input type='number' inputMode='numeric' min={50} {...register('hourly')} /></Field>
            <Field label='Full day, 8 hours (₹)' error={errors.fullDay?.message} hint='Full day and events'><Input type='number' inputMode='numeric' min={50} {...register('fullDay')} /></Field>
            <Field label='Outstation per day (₹)' error={errors.outstationPerDay?.message} hint='Outstation and multi-day'><Input type='number' inputMode='numeric' min={50} {...register('outstationPerDay')} /></Field>
          </div>
        </Card>

        <Card className='space-y-4'>
          <SectionTitle>Where and when you work</SectionTitle>
          <Field label='Base location' hint='Where you usually start from. It is updated automatically while you are online.'>
            <Controller control={control} name='baseLocation' render={({ field }) => (
              <AddressInput value={field.value} onChange={field.onChange} placeholder='Your area' allowCurrentLocation />
            )} />
          </Field>
          <Field label='How far will you travel to a pickup? (km)' error={errors.serviceRadiusKm?.message}><Input type='number' inputMode='numeric' min={1} max={100} className='w-32' {...register('serviceRadiusKm')} /></Field>

          <div className='rounded-xl border border-slate-200 p-4'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-sm font-bold text-slate-900'>Working hours</p>
                <p className='text-xs text-slate-500'>{workingEnabled ? 'You are only offered bookings that start in these hours.' : 'Off: you are offered bookings at any time while online.'}</p>
              </div>
              <Toggle checked={Boolean(workingEnabled)} label='Limit bookings to working hours' onChange={(value) => setValue('workingEnabled', value, { shouldDirty: true })} />
            </div>
            {workingEnabled && (
              <div className='mt-4 space-y-3'>
                <div className='flex flex-wrap gap-1.5' role='group' aria-label='Working days'>
                  {WEEKDAYS.map((label, day) => (
                    <button key={label} type='button' aria-pressed={workingDays.includes(day)} onClick={() => toggleDay(day)}
                      className={cx('h-10 w-12 rounded-xl text-[13px] font-semibold ring-1 ring-inset transition', workingDays.includes(day) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{label}</button>
                  ))}
                </div>
                {errors.workingDays && <p role='alert' className='text-xs font-medium text-red-600'>{errors.workingDays.message}</p>}
                <div className='grid max-w-xs grid-cols-2 gap-3'>
                  <Field label='From'><Input type='time' {...register('workingStart')} /></Field>
                  <Field label='To' error={errors.workingEnd?.message}><Input type='time' {...register('workingEnd')} /></Field>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className='space-y-4'>
          <SectionTitle action={<span className='flex items-center gap-1 text-xs font-medium text-slate-500'><Icon name='ri-lock-line' />Only our team sees these</span>}>Verification details</SectionTitle>
          <Field label='Home address' error={errors.address?.message}><Input autoComplete='street-address' {...register('address')} /></Field>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Field label='Driving licence number' error={errors.licenceNumber?.message}><Input {...register('licenceNumber')} /></Field>
            <Field label='Licence valid until' error={errors.licenceExpiry?.message}><Input type='date' {...register('licenceExpiry')} /></Field>
            <Field label='Emergency contact name' error={errors.emergencyName?.message}><Input {...register('emergencyName')} /></Field>
            <Field label='Emergency contact phone' error={errors.emergencyPhone?.message}><Input type='tel' inputMode='tel' {...register('emergencyPhone')} /></Field>
          </div>
          {verification.status === 'verified' && <Note tone='amber' icon='ri-error-warning-line'>Changing your licence details sends your profile back for review and takes you offline until it is approved.</Note>}
        </Card>

        <div className='sticky bottom-20 z-10 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lift backdrop-blur lg:bottom-4'>
          <Button type='submit' size='lg' className='flex-1 sm:flex-none sm:px-10' loading={save.isPending}>Save profile</Button>
          <div className='min-w-0 flex-1'>
            {save.error ? <ErrorNote>{errorMessage(save.error)}</ErrorNote>
              : Object.keys(errors).length > 0 ? <p className='text-sm font-medium text-red-600'>Check the highlighted fields above.</p>
                : isDirty && <p className='text-sm text-slate-500'>You have unsaved changes.</p>}
          </div>
        </div>
      </form>
    </div>
  )
}
