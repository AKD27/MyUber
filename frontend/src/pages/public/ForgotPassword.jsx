import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthShell from './AuthShell'
import { Button, Field, Icon, Input, Note, Select, ErrorNote } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { email } from '../../lib/schemas'

const ROLES = ['customer', 'driver', 'admin']
const schema = z.object({ email, role: z.enum(ROLES) })

export default function ForgotPassword() {
  const location = useLocation()
  const requested = new URLSearchParams(location.search).get('as')
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: ROLES.includes(requested) ? requested : 'customer' },
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
    <AuthShell title='Forgot your password?' subtitle='Enter your email and we will send you a link to set a new one.'>
      {sent ? (
        <Note tone='brand' icon='ri-mail-check-fill'>{sent} The link works for 30 minutes.</Note>
      ) : (
        <form className='space-y-4' onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label='Account type'>
            <Select {...register('role')}>
              <option value='customer'>Customer</option>
              <option value='driver'>Driver</option>
              <option value='admin'>Admin</option>
            </Select>
          </Field>
          <Field label='Email' error={errors.email?.message}><Input type='email' autoComplete='email' placeholder='you@example.com' aria-invalid={Boolean(errors.email)} {...register('email')} /></Field>
          <ErrorNote>{error}</ErrorNote>
          <Button type='submit' size='lg' className='w-full' loading={isSubmitting}>Send reset link</Button>
        </form>
      )}
      <p className='mt-6 text-center text-sm'><Link to='/login' className='inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline'><Icon name='ri-arrow-left-line' />Back to log in</Link></p>
    </AuthShell>
  )
}
