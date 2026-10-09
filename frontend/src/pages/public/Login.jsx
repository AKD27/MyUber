import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthShell from './AuthShell'
import { Button, Field, Input, Tabs, ErrorNote } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { email } from '../../lib/schemas'
import { useAuth } from '../../store/auth'

const schema = z.object({ email, password: z.string().min(1, 'Enter your password') })

const ROLES = [
  { value: 'customer', label: 'Customer' },
  { value: 'driver', label: 'Driver' },
  { value: 'admin', label: 'Admin' },
]

export default function Login() {
  const location = useLocation()
  const setSession = useAuth((state) => state.setSession)
  const [role, setRole] = useState(new URLSearchParams(location.search).get('as') || 'customer')
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
    <AuthShell title='Log in' subtitle='Welcome back.'>
      <Tabs tabs={ROLES} value={role} onChange={setRole} />
      <form className='space-y-4' onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label='Email' error={errors.email?.message}><Input type='email' autoComplete='email' {...register('email')} /></Field>
        <Field label='Password' error={errors.password?.message}><Input type='password' autoComplete='current-password' {...register('password')} /></Field>
        <ErrorNote>{error}</ErrorNote>
        <Button type='submit' className='w-full' loading={isSubmitting}>Log in as {ROLES.find((r) => r.value === role).label.toLowerCase()}</Button>
      </form>
      <div className='mt-4 flex justify-between text-sm'>
        <Link to={`/forgot-password?as=${role}`} className='text-teal-700 hover:underline'>Forgot password?</Link>
        {role !== 'admin' && <Link to={`/register?as=${role}`} className='text-teal-700 hover:underline'>Create an account</Link>}
      </div>
    </AuthShell>
  )
}
