import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { api, errorMessage } from '../../lib/api'
import { phone } from '../../lib/schemas'
import { useAuth } from '../../store/auth'
import { toast } from '../../store/toast'
import AddressInput from '../../components/AddressInput'
import { Button, Card, ErrorNote, Field, Input, PageHeader, Stars } from '../../components/ui'

const profileSchema = z.object({ firstname: z.string().trim().min(2, 'Enter your first name'), lastname: z.string().trim().optional(), phone })
const locationSchema = z.object({ label: z.string().trim().min(1, 'Name this place, e.g. Home'), place: z.object({ address: z.string().min(3) }).passthrough().nullable().refine(Boolean, 'Enter an address') })

export default function CustomerProfile() {
  const { account, setAccount } = useAuth()
  const [locationError, setLocationError] = useState('')

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstname: account.fullname.firstname, lastname: account.fullname.lastname || '', phone: account.phone },
  })
  const locationForm = useForm({ resolver: zodResolver(locationSchema), defaultValues: { label: '', place: null } })

  const saveProfile = useMutation({
    mutationFn: ({ firstname, lastname, phone: newPhone }) =>
      api.patch('/customers/me', { fullname: { firstname, lastname: lastname || undefined }, phone: newPhone }).then((res) => res.data),
    onSuccess: (data) => { setAccount(data.account); toast('Profile saved', 'success') },
  })

  const addLocation = async (values) => {
    setLocationError('')
    try {
      const { data } = await api.post('/customers/me/locations', values)
      setAccount({ ...account, savedLocations: data.savedLocations })
      locationForm.reset({ label: '', place: null })
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

  return (
    <div className='max-w-2xl space-y-6'>
      <PageHeader title='Profile' subtitle={account.email} action={<span className='text-sm text-gray-600'>Your rating: <Stars value={account.rating.average} count={account.rating.count} /></span>} />

      <Card>
        <form className='space-y-4' onSubmit={profileForm.handleSubmit((v) => saveProfile.mutate(v))} noValidate>
          <div className='grid grid-cols-2 gap-3'>
            <Field label='First name' error={profileForm.formState.errors.firstname?.message}><Input {...profileForm.register('firstname')} /></Field>
            <Field label='Last name'><Input {...profileForm.register('lastname')} /></Field>
          </div>
          <Field label='Mobile number' error={profileForm.formState.errors.phone?.message}><Input type='tel' {...profileForm.register('phone')} /></Field>
          <ErrorNote>{saveProfile.error && errorMessage(saveProfile.error)}</ErrorNote>
          <Button type='submit' loading={saveProfile.isPending}>Save</Button>
        </form>
      </Card>

      <Card>
        <h2 className='mb-3 font-semibold'>Saved locations</h2>
        <ul className='mb-4 divide-y divide-gray-100'>
          {account.savedLocations.length === 0 && <li className='py-2 text-sm text-gray-500'>Save places like Home or Office to pick them quickly when booking.</li>}
          {account.savedLocations.map((saved) => (
            <li key={saved._id} className='flex items-center justify-between gap-3 py-2 text-sm'>
              <span><b>{saved.label}</b> · {saved.place.address}</span>
              <button type='button' aria-label={`Delete ${saved.label}`} onClick={() => removeLocation(saved._id)} className='text-gray-400 hover:text-red-600'><i aria-hidden='true' className='ri-delete-bin-line' /></button>
            </li>
          ))}
        </ul>
        <form className='grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-start' onSubmit={locationForm.handleSubmit(addLocation)} noValidate>
          <Field error={locationForm.formState.errors.label?.message}><Input placeholder='Label' {...locationForm.register('label')} /></Field>
          <Field error={locationForm.formState.errors.place?.message}>
            <Controller control={locationForm.control} name='place' render={({ field }) => (
              <AddressInput value={field.value} onChange={field.onChange} placeholder='Address' allowCurrentLocation />
            )} />
          </Field>
          <Button type='submit' variant='secondary' loading={locationForm.formState.isSubmitting}>Add</Button>
        </form>
        <ErrorNote>{locationError}</ErrorNote>
      </Card>
    </div>
  )
}
