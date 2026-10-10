import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthShell, { PasswordInput } from './AuthShell'
import { Button, Field, Input, Tabs, ErrorNote } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { email } from '../../lib/schemas'
import { useAuth } from '../../store/auth'

const schema = z.object({ email, password: z.string().min(1, 'Enter your password') })

const ROLES = [
  { value: 'customer', label: 'Customer', icon: 'ri-user-3-line' },
  { value: 'driver', label: 'Driver', icon: 'ri-steering-2-line' },
  { value: 'admin', label: 'Admin', icon: 'ri-shield-user-line' },
]

export default function Login() {
  const location = useLocation()
  const setSession = useAuth((state) => state.setSession)
  const requested = new URLSearchParams(location.search).get('as')
  const [role, setRole] = useState(ROLES.some((r) => r.value === requested) ? requested : 'customer')
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    setError('')
    try {
      const { data } = await api.post('/auth/login', { ...values, role })
      // GuestOnly then redirects to the right page.
      setSession(data)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <AuthShell title='Welcome back' subtitle='Log in to book a driver or manage your trips.'>
      <Tabs tabs={ROLES} value={role} onChange={(value) => { setRole(value); setError('') }} />
      <form className='space-y-4' onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label='Email' error={errors.email?.message}><Input type='email' autoComplete='email' placeholder='you@example.com' aria-invalid={Boolean(errors.email)} {...register('email')} /></Field>
        <Field label='Password' error={errors.password?.message}><PasswordInput autoComplete='current-password' aria-invalid={Boolean(errors.password)} {...register('password')} /></Field>
        <div className='text-right'><Link to={`/forgot-password?as=${role}`} className='text-sm font-semibold text-brand-700 hover:underline'>Forgot password?</Link></div>
        <ErrorNote>{error}</ErrorNote>
        <Button type='submit' size='lg' className='w-full' loading={isSubmitting}>Log in</Button>
      </form>
      {role !== 'admin' && (
        <p className='mt-6 text-center text-sm text-slate-600'>New here? <Link to={`/register?as=${role}`} className='font-semibold text-brand-700 hover:underline'>Create an account</Link></p>
      )}
    </AuthShell>
  )
}
