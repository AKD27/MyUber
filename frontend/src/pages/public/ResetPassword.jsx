import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthShell, { PasswordInput } from './AuthShell'
import { Button, buttonClass, Field, Note, ErrorNote } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { password } from '../../lib/schemas'

const schema = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export default function ResetPassword() {
  const params = new URLSearchParams(useLocation().search)
  const role = params.get('role')
  const token = params.get('token')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async ({ password: newPassword }) => {
    setError('')
    try {
      await api.post('/auth/reset-password', { role, token, password: newPassword })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (!role || !token) {
    return (
      <AuthShell title='This link is not valid' subtitle='The reset link is incomplete or has expired.'>
        <Link to='/forgot-password' className={buttonClass({ size: 'lg', className: 'w-full' })}>Request a new link</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title='Set a new password' subtitle='Choose a password you have not used before.'>
      {done ? (
        <div className='space-y-4'>
          <Note tone='brand' icon='ri-checkbox-circle-fill'>Your password has been updated.</Note>
          <Link to={`/login?as=${role}`} className={buttonClass({ size: 'lg', className: 'w-full' })}>Log in</Link>
        </div>
      ) : (
        <form className='space-y-4' onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label='New password' error={errors.password?.message} hint='At least 8 characters'><PasswordInput autoComplete='new-password' aria-invalid={Boolean(errors.password)} {...register('password')} /></Field>
          <Field label='Confirm password' error={errors.confirm?.message}><PasswordInput autoComplete='new-password' aria-invalid={Boolean(errors.confirm)} {...register('confirm')} /></Field>
          <ErrorNote>{error}</ErrorNote>
          <Button type='submit' size='lg' className='w-full' loading={isSubmitting}>Update password</Button>
        </form>
      )}
    </AuthShell>
  )
}
