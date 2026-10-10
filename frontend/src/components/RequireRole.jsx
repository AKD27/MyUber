import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, homeFor } from '../store/auth'
import { Spinner } from './ui'

// Only lets the given role through; others go to login or their own home.
export function RequireRole({ role, children }) {
  const { status, role: currentRole, account } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Spinner className='min-h-dvh' />
  if (status !== 'authenticated') return <Navigate to='/login' replace state={{ from: location.pathname }} />
  if (currentRole !== role) return <Navigate to={homeFor(currentRole, account)} replace />
  return children
}

// Public pages (login, register) send logged-in users on: back to the page that asked them
// to log in, or to their home. Logging in on these pages lands here too.
export function GuestOnly({ children }) {
  const { status, role, account } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Spinner className='min-h-dvh' />
  if (status === 'authenticated') return <Navigate to={location.state?.from || homeFor(role, account)} replace />
  return children
}
