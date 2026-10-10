import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth, homeFor } from './store/auth'
import { useRealtime } from './hooks/useRealtime'
import { useDriverLocation } from './hooks/useDriverLocation'
import Layout from './components/Layout'
import Toasts from './components/Toasts'
import { GuestOnly, RequireRole } from './components/RequireRole'
import { buttonClass, Icon } from './components/ui'
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import ForgotPassword from './pages/public/ForgotPassword'
import ResetPassword from './pages/public/ResetPassword'
import TrackTrip from './pages/public/TrackTrip'
import Support from './pages/Support'
import BookDriver from './pages/customer/BookDriver'
import MyBookings from './pages/customer/MyBookings'
import CustomerBookingDetail from './pages/customer/BookingDetail'
import CustomerProfile from './pages/customer/Profile'
import DriverDashboard from './pages/driver/DriverDashboard'
import DriverBookings from './pages/driver/DriverBookings'
import DriverBookingDetail from './pages/driver/DriverBookingDetail'
import DriverEarnings from './pages/driver/DriverEarnings'
import DriverProfile from './pages/driver/DriverProfile'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminDrivers from './pages/admin/AdminDrivers'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminBookings from './pages/admin/AdminBookings'
import AdminComplaints from './pages/admin/AdminComplaints'
import AdminSafety from './pages/admin/AdminSafety'

const as = (role, element) => <RequireRole role={role}>{element}</RequireRole>
const guest = (element) => <GuestOnly>{element}</GuestOnly>

function NotFound() {
  const { role, account } = useAuth()
  return (
    <div className='flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-6 text-center'>
      <span className='flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-3xl text-brand-400'><Icon name='ri-compass-3-line' /></span>
      <h1 className='mt-5 text-2xl font-extrabold tracking-tight text-slate-900'>We could not find that page</h1>
      <p className='mt-1 text-sm text-slate-500'>The link may be old, or the page may have moved.</p>
      <Link to={homeFor(role, account)} className={buttonClass({ className: 'mt-6' })}>Go to the home page</Link>
    </div>
  )
}

export default function App() {
  const { load, role, account } = useAuth()
  const { pathname } = useLocation()

  useEffect(() => { load() }, [load])
  // A new page starts at the top, as it would with full page loads.
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  useRealtime()
  // While online, keep the driver's position fresh so nearby customers can find them.
  useDriverLocation(role === 'driver' && account?.isOnline ? 'idle' : null)

  return (
    <>
      <Toasts />
      <Routes>
        <Route path='/' element={guest(<Landing />)} />
        <Route path='/login' element={guest(<Login />)} />
        <Route path='/register' element={guest(<Register />)} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/track/:token' element={<TrackTrip />} />

        <Route element={<Layout />}>
          <Route path='/book' element={as('customer', <BookDriver />)} />
          <Route path='/bookings' element={as('customer', <MyBookings />)} />
          <Route path='/bookings/:id' element={as('customer', <CustomerBookingDetail />)} />
          <Route path='/support' element={as('customer', <Support />)} />
          <Route path='/profile' element={as('customer', <CustomerProfile />)} />

          <Route path='/driver' element={as('driver', <DriverDashboard />)} />
          <Route path='/driver/bookings' element={as('driver', <DriverBookings />)} />
          <Route path='/driver/bookings/:id' element={as('driver', <DriverBookingDetail />)} />
          <Route path='/driver/earnings' element={as('driver', <DriverEarnings />)} />
          <Route path='/driver/profile' element={as('driver', <DriverProfile />)} />
          <Route path='/driver/support' element={as('driver', <Support />)} />

          <Route path='/admin' element={as('admin', <AdminDashboard />)} />
          <Route path='/admin/drivers' element={as('admin', <AdminDrivers />)} />
          <Route path='/admin/customers' element={as('admin', <AdminCustomers />)} />
          <Route path='/admin/bookings' element={as('admin', <AdminBookings />)} />
          <Route path='/admin/complaints' element={as('admin', <AdminComplaints />)} />
          <Route path='/admin/safety' element={as('admin', <AdminSafety />)} />
        </Route>

        <Route path='*' element={<NotFound />} />
      </Routes>
    </>
  )
}
