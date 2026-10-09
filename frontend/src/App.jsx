import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/auth'
import { useRealtime } from './hooks/useRealtime'
import { useDriverLocation } from './hooks/useDriverLocation'
import Layout from './components/Layout'
import Toasts from './components/Toasts'
import { GuestOnly, RequireRole } from './components/RequireRole'
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import ForgotPassword from './pages/public/ForgotPassword'
import ResetPassword from './pages/public/ResetPassword'
import BookDriver from './pages/customer/BookDriver'
import MyBookings from './pages/customer/MyBookings'
import CustomerBookingDetail from './pages/customer/BookingDetail'
import CustomerProfile from './pages/customer/Profile'
import DriverDashboard from './pages/driver/DriverDashboard'
import DriverBookings from './pages/driver/DriverBookings'
import DriverBookingDetail from './pages/driver/DriverBookingDetail'
import DriverProfile from './pages/driver/DriverProfile'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminDrivers from './pages/admin/AdminDrivers'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminBookings from './pages/admin/AdminBookings'

const as = (role, element) => <RequireRole role={role}>{element}</RequireRole>
const guest = (element) => <GuestOnly>{element}</GuestOnly>

export default function App() {
  const { load, role, account } = useAuth()

  useEffect(() => { load() }, [load])
  useRealtime()
  useDriverLocation(role === 'driver' && account?.isOnline)

  return (
    <>
      <Toasts />
      <Routes>
        <Route path='/' element={guest(<Landing />)} />
        <Route path='/login' element={guest(<Login />)} />
        <Route path='/register' element={guest(<Register />)} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />

        <Route element={<Layout />}>
          <Route path='/book' element={as('customer', <BookDriver />)} />
          <Route path='/bookings' element={as('customer', <MyBookings />)} />
          <Route path='/bookings/:id' element={as('customer', <CustomerBookingDetail />)} />
          <Route path='/profile' element={as('customer', <CustomerProfile />)} />

          <Route path='/driver' element={as('driver', <DriverDashboard />)} />
          <Route path='/driver/bookings' element={as('driver', <DriverBookings />)} />
          <Route path='/driver/bookings/:id' element={as('driver', <DriverBookingDetail />)} />
          <Route path='/driver/profile' element={as('driver', <DriverProfile />)} />

          <Route path='/admin' element={as('admin', <AdminDashboard />)} />
          <Route path='/admin/drivers' element={as('admin', <AdminDrivers />)} />
          <Route path='/admin/customers' element={as('admin', <AdminCustomers />)} />
          <Route path='/admin/bookings' element={as('admin', <AdminBookings />)} />
        </Route>

        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </>
  )
}
