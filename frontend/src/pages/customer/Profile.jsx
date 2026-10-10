import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { api, errorMessage } from '../../lib/api'
import { phone } from '../../lib/schemas'
import { fullName } from '../../lib/format'
import { useAuth } from '../../store/auth'
import { toast } from '../../store/toast'
import AddressInput from '../../components/AddressInput'
import Avatar from '../../components/Avatar'
import { Button, Card, ErrorNote, Field, Icon, IconButton, Input, PageHeader, SectionTitle, Stars } from '../../components/ui'

const profileSchema = z.object({ firstname: z.string().trim().min(2, 'Enter your first name'), lastname: z.string().trim().optional(), phone })
const contactSchema = z.object({ name: z.string().trim().min(2, 'Enter their name'), phone })
const locationSchema = z.object({ label: z.string().trim().min(1, 'Name this place, e.g. Home').max(40), place: z.object({ address: z.string().min(3) }).passthrough().nullable().refine(Boolean, 'Enter an address') })

const LABEL_ICONS = { home: 'ri-home-5-fill', office: 'ri-building-2-fill', work: 'ri-building-2-fill' }

export default function CustomerProfile() {
  const { account, setAccount } = useAuth()
  const [locationError, setLocationError] = useState('')

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstname: account.fullname.firstname, lastname: account.fullname.lastname || '', phone: account.phone },
  })
  const contactForm = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: account.emergencyContact?.name || '', phone: account.emergencyContact?.phone || '' },
  })
  const locationForm = useForm({ resolver: zodResolver(locationSchema), defaultValues: { label: '', place: null } })

  const save = useMutation({
    mutationFn: (body) => api.patch('/customers/me', body).then((res) => res.data),
    onSuccess: (data, body) => { setAccount(data.account); toast(body.emergencyContact === null ? 'Emergency contact removed' : 'Saved', 'success') },
    onError: (err) => toast(errorMessage(err), 'error'),
  })

  const addLocation = async (values) => {
    setLocationError('')
    try {
      const { data } = await api.post('/customers/me/locations', values)
      setAccount({ ...account, savedLocations: data.savedLocations })
      locationForm.reset({ label: '', place: null })
      toast('Place saved', 'success')
    } catch (err) {
      setLocationError(errorMessage(err))
    }
  }

  const removeLocation = async (locationId) => {
    try {
      const { data } = await api.delete(`/customers/me/locations/${locationId}`)
      setAccount({ ...account, savedLocations: data.savedLocations })
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const removeContact = () => {
    save.mutate({ emergencyContact: null })
    contactForm.reset({ name: '', phone: '' })
  }

  return (
    <div className='mx-auto max-w-2xl space-y-5'>
      <PageHeader title='Profile' />

      <Card className='flex items-center gap-4'>
        <Avatar person={account} size='h-16 w-16' className='text-xl' />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-lg font-extrabold text-slate-900'>{fullName(account)}</p>
          <p className='truncate text-sm text-slate-500'>{account.email}</p>
        </div>
        <div className='text-right'>
          <Stars value={account.rating.average} count={account.rating.count} size='text-base' />
          <p className='text-xs text-slate-500'>Rated by drivers</p>
        </div>
      </Card>

      <Card>
        <SectionTitle>Personal details</SectionTitle>
        <form className='space-y-4' onSubmit={profileForm.handleSubmit(({ firstname, lastname, phone: newPhone }) => save.mutate({ fullname: { firstname, lastname: lastname || undefined }, phone: newPhone }))} noValidate>
          <div className='grid grid-cols-2 gap-3'>
            <Field label='First name' error={profileForm.formState.errors.firstname?.message}><Input autoComplete='given-name' {...profileForm.register('firstname')} /></Field>
            <Field label='Last name'><Input autoComplete='family-name' {...profileForm.register('lastname')} /></Field>
          </div>
          <Field label='Mobile number' error={profileForm.formState.errors.phone?.message} hint='Shared with your driver only from confirmation until the trip ends.'><Input type='tel' inputMode='tel' autoComplete='tel' {...profileForm.register('phone')} /></Field>
          <Button type='submit' loading={save.isPending && Boolean(save.variables?.fullname)}>Save changes</Button>
        </form>
      </Card>

      <Card>
        <SectionTitle>Emergency contact</SectionTitle>
        <p className='-mt-1 mb-4 text-sm text-slate-500'>One tap away on the SOS screen during a trip.</p>
        <form className='space-y-4' onSubmit={contactForm.handleSubmit((emergencyContact) => save.mutate({ emergencyContact }))} noValidate>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Field label='Name' error={contactForm.formState.errors.name?.message}><Input placeholder='A family member or friend' {...contactForm.register('name')} /></Field>
            <Field label='Mobile number' error={contactForm.formState.errors.phone?.message}><Input type='tel' inputMode='tel' {...contactForm.register('phone')} /></Field>
          </div>
          <div className='flex gap-2'>
            <Button type='submit' loading={save.isPending && Boolean(save.variables?.emergencyContact)}>Save contact</Button>
            {account.emergencyContact?.phone && <Button variant='ghost' onClick={removeContact}>Remove</Button>}
          </div>
        </form>
      </Card>

      <Card>
        <SectionTitle>Saved places</SectionTitle>
        <ul className='mb-5 space-y-2'>
          {account.savedLocations.length === 0 && <li className='rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500'>Save places like Home or Office to pick them in one tap when booking.</li>}
          {account.savedLocations.map((saved) => (
            <li key={saved._id} className='flex items-center gap-3 rounded-xl border border-slate-200 p-3'>
              <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg text-brand-700'><Icon name={LABEL_ICONS[saved.label.toLowerCase()] || 'ri-bookmark-fill'} /></span>
              <span className='min-w-0 flex-1'>
                <span className='block text-sm font-bold text-slate-900'>{saved.label}</span>
                <span className='block truncate text-[13px] text-slate-500'>{saved.place.address}</span>
              </span>
              <IconButton icon='ri-delete-bin-line' label={`Delete ${saved.label}`} onClick={() => removeLocation(saved._id)} className='hover:!bg-red-50 hover:!text-red-600' />
            </li>
          ))}
        </ul>
        <form className='grid gap-3 sm:grid-cols-[150px_1fr_auto] sm:items-start' onSubmit={locationForm.handleSubmit(addLocation)} noValidate>
          <Field error={locationForm.formState.errors.label?.message}><Input placeholder='Label, e.g. Home' aria-label='Label' maxLength={40} {...locationForm.register('label')} /></Field>
          <Field error={locationForm.formState.errors.place?.message}>
            <Controller control={locationForm.control} name='place' render={({ field }) => (
              <AddressInput value={field.value} onChange={field.onChange} placeholder='Address' allowCurrentLocation />
            )} />
          </Field>
          <Button type='submit' variant='secondary' loading={locationForm.formState.isSubmitting}><Icon name='ri-add-line' />Add</Button>
        </form>
        <ErrorNote className='mt-3'>{locationError}</ErrorNote>
      </Card>
    </div>
  )
}
