import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AuthShell, { PasswordInput } from './AuthShell'
import { Button, Field, Input, Tabs, ErrorNote } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { registerSchema } from '../../lib/schemas'
import { useAuth } from '../../store/auth'

const ROLES = [
  { value: 'customer', label: 'I need a driver', icon: 'ri-user-3-line' },
  { value: 'driver', label: 'I am a driver', icon: 'ri-steering-2-line' },
]

export default function Register() {
  const location = useLocation()
  const setSession = useAuth((state) => state.setSession)
  const [role, setRole] = useState(new URLSearchParams(location.search).get('as') === 'driver' ? 'driver' : 'customer')
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(registerSchema) })

  const onSubmit = async ({ firstname, lastname, ...rest }) => {
    setError('')
    try {
      const { data } = await api.post(`/auth/register/${role}`, { ...rest, fullname: { firstname, lastname: lastname || undefined } })
      // GuestOnly then redirects to the right page.
      setSession(data)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <AuthShell title='Create your account' subtitle={role === 'driver' ? 'Drive customers’ own cars and earn on your schedule.' : 'Hire verified drivers for your own car.'}>
      <Tabs tabs={ROLES} value={role} onChange={(value) => { setRole(value); setError('') }} />
      <form className='space-y-4' onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className='grid grid-cols-2 gap-3'>
          <Field label='First name' error={errors.firstname?.message}><Input autoComplete='given-name' aria-invalid={Boolean(errors.firstname)} {...register('firstname')} /></Field>
          <Field label='Last name' error={errors.lastname?.message}><Input autoComplete='family-name' {...register('lastname')} /></Field>
        </div>
        <Field label='Email' error={errors.email?.message}><Input type='email' autoComplete='email' placeholder='you@example.com' aria-invalid={Boolean(errors.email)} {...register('email')} /></Field>
        <Field label='Mobile number' error={errors.phone?.message}><Input type='tel' inputMode='tel' autoComplete='tel' placeholder='98765 43210' aria-invalid={Boolean(errors.phone)} {...register('phone')} /></Field>
        <Field label='Password' error={errors.password?.message} hint='At least 8 characters'><PasswordInput autoComplete='new-password' aria-invalid={Boolean(errors.password)} {...register('password')} /></Field>
        <ErrorNote>{error}</ErrorNote>
        <Button type='submit' size='lg' variant={role === 'driver' ? 'brand' : 'primary'} className='w-full' loading={isSubmitting}>{role === 'driver' ? 'Sign up as a driver' : 'Create account'}</Button>
      </form>
      <p className='mt-6 text-center text-sm text-slate-600'>Already have an account? <Link to={`/login?as=${role}`} className='font-semibold text-brand-700 hover:underline'>Log in</Link></p>
    </AuthShell>
  )
}
