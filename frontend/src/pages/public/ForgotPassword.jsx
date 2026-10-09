import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthShell from './AuthShell'
import { Button, Field, Input, Select, ErrorNote } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { email } from '../../lib/schemas'

const schema = z.object({ email, role: z.enum(['customer', 'driver', 'admin']) })

export default function ForgotPassword() {
  const location = useLocation()
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: new URLSearchParams(location.search).get('as') || 'customer' },
  })

  const onSubmit = async (values) => {
    setError('')
    try {
      const { data } = await api.post('/auth/forgot-password', values)
      setSent(data.message)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <AuthShell title='Forgot password' subtitle='We will email you a link to set a new password.'>
      {sent ? (
        <p className='rounded-lg bg-teal-50 p-3 text-sm text-teal-900'>{sent}</p>
      ) : (
        <form className='space-y-4' onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label='Account type'>
            <Select {...register('role')}>
              <option value='customer'>Customer</option>
              <option value='driver'>Driver</option>
              <option value='admin'>Admin</option>
            </Select>
          </Field>
          <Field label='Email' error={errors.email?.message}><Input type='email' {...register('email')} /></Field>
          <ErrorNote>{error}</ErrorNote>
          <Button type='submit' className='w-full' loading={isSubmitting}>Send reset link</Button>
        </form>
      )}
      <p className='mt-4 text-center text-sm'><Link to='/login' className='text-teal-700 hover:underline'>Back to log in</Link></p>
    </AuthShell>
  )
}
