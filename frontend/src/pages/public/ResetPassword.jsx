import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthShell from './AuthShell'
import { Button, Field, Input, ErrorNote } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { password } from '../../lib/schemas'

const schema = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export default function ResetPassword() {
  const params = new URLSearchParams(useLocation().search)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async ({ password: newPassword }) => {
    setError('')
    try {
      await api.post('/auth/reset-password', { role: params.get('role'), token: params.get('token'), password: newPassword })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <AuthShell title='Set a new password'>
      {done ? (
        <div className='space-y-3'>
          <p className='rounded-lg bg-teal-50 p-3 text-sm text-teal-900'>Your password has been updated.</p>
          <Link to={`/login?as=${params.get('role') || 'customer'}`} className='block text-center text-sm font-semibold text-teal-700 hover:underline'>Log in</Link>
        </div>
      ) : (
        <form className='space-y-4' onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label='New password' error={errors.password?.message}><Input type='password' autoComplete='new-password' {...register('password')} /></Field>
          <Field label='Confirm password' error={errors.confirm?.message}><Input type='password' autoComplete='new-password' {...register('confirm')} /></Field>
          <ErrorNote>{error}</ErrorNote>
          <Button type='submit' className='w-full' loading={isSubmitting}>Update password</Button>
        </form>
      )}
    </AuthShell>
  )
}
