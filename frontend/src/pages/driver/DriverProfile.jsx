import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api, errorMessage } from '../../lib/api'
import { BOOKING_TYPES, CAR_TYPES, TRANSMISSIONS } from '../../lib/constants'
import { phone } from '../../lib/schemas'
import { useAuth } from '../../store/auth'
import { toast } from '../../store/toast'
import AddressInput from '../../components/AddressInput'
import { Button, Card, ErrorNote, Field, Input, PageHeader, Spinner, Textarea, VerificationBadge } from '../../components/ui'

// Empty number inputs mean "not set".
const optionalNumber = (schema) => z.preprocess((v) => (v === '' || v === null || Number.isNaN(v) ? undefined : Number(v)), schema.optional())

const schema = z.object({
  firstname: z.string().trim().min(2, 'Enter your first name'),
  lastname: z.string().trim().optional(),
  phone,
  profilePhotoUrl: z.string().trim().url('Enter a full image link (https://…)').or(z.literal('')),
  about: z.string().max(1000).optional(),
  experienceYears: optionalNumber(z.number().int().min(0).max(60)),
  languages: z.string().optional(),
  services: z.array(z.string()).default([]),
  vehicleTypes: z.array(z.string()).default([]),
  transmissions: z.array(z.string()).default([]),
  hourly: optionalNumber(z.number().int().min(50, 'At least ₹50')),
  fullDay: optionalNumber(z.number().int().min(50, 'At least ₹50')),
  outstationPerDay: optionalNumber(z.number().int().min(50, 'At least ₹50')),
  serviceRadiusKm: optionalNumber(z.number().int().min(1).max(100)),
  address: z.string().trim().optional(),
  licenceNumber: z.string().trim().optional(),
  licenceExpiry: z.string().optional(),
  emergencyName: z.string().trim().optional(),
  emergencyPhone: phone.or(z.literal('')).optional(),
  baseLocation: z.any().optional(),
})

const toForm = (d) => ({
  firstname: d.fullname.firstname,
  lastname: d.fullname.lastname || '',
  phone: d.phone,
  profilePhotoUrl: d.profilePhotoUrl || '',
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
    profilePhotoUrl: v.profilePhotoUrl,
    about: v.about || undefined,
    experienceYears: v.experienceYears,
    languages: v.languages ? v.languages.split(',').map((l) => l.trim()).filter(Boolean) : undefined,
    services: v.services,
    vehicleTypes: v.vehicleTypes,
    transmissions: v.transmissions,
    rates: { hourly: v.hourly, fullDay: v.fullDay, outstationPerDay: v.outstationPerDay },
    serviceRadiusKm: v.serviceRadiusKm,
    address: v.address || undefined,
  }
  if (v.licenceNumber && v.licenceExpiry) body.licence = { number: v.licenceNumber, expiry: v.licenceExpiry }
  if (v.emergencyName && v.emergencyPhone) body.emergencyContact = { name: v.emergencyName, phone: v.emergencyPhone }
  // Only send a newly picked location, not the placeholder for the saved one.
  const saved = original.baseLocation
  const unchanged = saved && v.baseLocation?.lat === saved.lat && v.baseLocation?.lng === saved.lng
  if (v.baseLocation?.address && !unchanged) body.baseLocation = v.baseLocation
  return body
}

function CheckboxGroup({ options, register, name }) {
  return (
    <div className='flex flex-wrap gap-2'>
      {Object.entries(options).map(([value, label]) => (
        <label key={value} className='flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50'>
          <input type='checkbox' value={value} {...register(name)} className='accent-teal-700' />
          {typeof label === 'string' ? label : label.label}
        </label>
      ))}
    </div>
  )
}

export default function DriverProfile() {
  const queryClient = useQueryClient()
  const setAccount = useAuth((state) => state.setAccount)

  const profile = useQuery({ queryKey: ['driver-profile'], queryFn: () => api.get('/drivers/me').then((res) => res.data) })
  const form = useForm({ resolver: zodResolver(schema) })
  const { register, handleSubmit, control, reset, formState: { errors } } = form

  useEffect(() => {
    if (profile.data) reset(toForm(profile.data.account))
  }, [profile.data, reset])

  const onSaved = (data, message) => {
    queryClient.setQueryData(['driver-profile'], data)
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

  return (
    <div className='max-w-3xl space-y-6'>
      <PageHeader title='Driver profile' subtitle='Customers see your name, photo, experience, languages, services, rates and reviews.' />

      <Card className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <p className='font-semibold'>Verification</p>
          <VerificationBadge status={verification.status} />
        </div>
        {verification.status === 'rejected' && verification.note && <p className='rounded-lg bg-red-50 p-3 text-sm text-red-700'>Admin note: {verification.note}</p>}
        {verification.status === 'under_review' && <p className='text-sm text-gray-600'>An admin is reviewing your details. You will be notified here.</p>}
        {canSubmit && missingFields.length > 0 && <p className='text-sm text-gray-600'>Still needed: {missingFields.join(', ')}.</p>}
        {canSubmit && (
          <Button onClick={() => submit.mutate()} disabled={missingFields.length > 0} loading={submit.isPending}>Submit for verification</Button>
        )}
        <ErrorNote>{submit.error && errorMessage(submit.error)}</ErrorNote>
      </Card>

      <form className='space-y-6' onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <Card className='space-y-4'>
          <h2 className='font-semibold'>About you</h2>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Field label='First name' error={errors.firstname?.message}><Input {...register('firstname')} /></Field>
            <Field label='Last name'><Input {...register('lastname')} /></Field>
            <Field label='Mobile number' error={errors.phone?.message}><Input type='tel' {...register('phone')} /></Field>
            <Field label='Driving experience (years)' error={errors.experienceYears?.message}><Input type='number' min={0} {...register('experienceYears')} /></Field>
          </div>
          <Field label='Profile photo link (optional)' error={errors.profilePhotoUrl?.message} hint='Photo upload is coming soon; paste an image link for now.'><Input {...register('profilePhotoUrl')} /></Field>
          <Field label='Languages you speak' hint='Separate with commas, e.g. Hindi, English'><Input {...register('languages')} /></Field>
          <Field label='About you (optional)'><Textarea {...register('about')} placeholder='Your driving background, routes you know well…' /></Field>
        </Card>

        <Card className='space-y-4'>
          <h2 className='font-semibold'>Services and rates</h2>
          <Field label='Services you offer'><CheckboxGroup options={BOOKING_TYPES} register={register} name='services' /></Field>
          <Field label='Cars you can drive'><CheckboxGroup options={CAR_TYPES} register={register} name='vehicleTypes' /></Field>
          <Field label='Gears'><CheckboxGroup options={TRANSMISSIONS} register={register} name='transmissions' /></Field>
          <div className='grid gap-3 sm:grid-cols-3'>
            <Field label='Hourly rate (₹)' error={errors.hourly?.message} hint='Hourly & airport, and extra hours'><Input type='number' min={50} {...register('hourly')} /></Field>
            <Field label='Full day, 8 hours (₹)' error={errors.fullDay?.message} hint='Full day & events'><Input type='number' min={50} {...register('fullDay')} /></Field>
            <Field label='Outstation per day (₹)' error={errors.outstationPerDay?.message} hint='Outstation & multi-day'><Input type='number' min={50} {...register('outstationPerDay')} /></Field>
          </div>
          <Field label='How far will you travel to a pickup? (km)' error={errors.serviceRadiusKm?.message}><Input type='number' min={1} max={100} {...register('serviceRadiusKm')} /></Field>
          <Field label='Base location' hint='Where you usually start from. Updated automatically while you are online.'>
            <Controller control={control} name='baseLocation' render={({ field }) => (
              <AddressInput value={field.value} onChange={field.onChange} placeholder='Your area' allowCurrentLocation />
            )} />
          </Field>
        </Card>

        <Card className='space-y-4'>
          <h2 className='font-semibold'>Verification details <span className='text-sm font-normal text-gray-500'>(only admins see these)</span></h2>
          <Field label='Address'><Input {...register('address')} /></Field>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Field label='Driving licence number'><Input {...register('licenceNumber')} /></Field>
            <Field label='Licence valid until'><Input type='date' {...register('licenceExpiry')} /></Field>
            <Field label='Emergency contact name'><Input {...register('emergencyName')} /></Field>
            <Field label='Emergency contact phone' error={errors.emergencyPhone?.message}><Input type='tel' {...register('emergencyPhone')} /></Field>
          </div>
          {account.verification.status === 'verified' && <p className='text-xs text-amber-700'>Changing your licence details sends your profile back for review.</p>}
        </Card>

        <ErrorNote>{save.error && errorMessage(save.error)}</ErrorNote>
        <Button type='submit' className='w-full sm:w-auto' loading={save.isPending}>Save profile</Button>
      </form>
    </div>
  )
}
