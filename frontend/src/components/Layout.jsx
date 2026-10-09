import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth, homeFor } from '../store/auth'
import { fullName } from '../lib/format'
import {  } from './ui'
import { cx } from '../lib/cx'

const NAV = {
  customer: [
    { to: '/book', label: 'Book a driver', icon: 'ri-steering-2-line' },
    { to: '/bookings', label: 'My bookings', icon: 'ri-calendar-check-line' },
    { to: '/profile', label: 'Profile', icon: 'ri-user-line' },
  ],
  driver: [
    { to: '/driver', label: 'Dashboard', icon: 'ri-dashboard-line', end: true },
    { to: '/driver/bookings', label: 'Bookings', icon: 'ri-calendar-check-line' },
    { to: '/driver/profile', label: 'Profile', icon: 'ri-id-card-line' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: 'ri-dashboard-line', end: true },
    { to: '/admin/drivers', label: 'Drivers', icon: 'ri-steering-line' },
    { to: '/admin/customers', label: 'Customers', icon: 'ri-group-line' },
    { to: '/admin/bookings', label: 'Bookings', icon: 'ri-file-list-3-line' },
  ],
}

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className='flex items-center gap-2 font-bold text-gray-900'>
      <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white'><i aria-hidden='true' className='ri-steering-2-fill' /></span>
      <span>Driver<span className='text-teal-700'>OnDemand</span></span>
    </Link>
  )
}

export default function Layout() {
  const { role, account, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = NAV[role] || []

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) => cx('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-teal-50 text-teal-800' : 'text-gray-600 hover:bg-gray-100')

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='sticky top-0 z-[500] border-b border-gray-200 bg-white'>
        <div className='mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4'>
          <Logo to={homeFor(role, account)} />
          <nav className='hidden items-center gap-1 md:flex'>
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}><i aria-hidden='true' className={link.icon} />{link.label}</NavLink>
            ))}
          </nav>
          <div className='flex items-center gap-2'>
            <span className='hidden text-sm text-gray-600 sm:block'>{fullName(account)}{role === 'admin' && ' · Admin'}</span>
            <button type='button' onClick={onLogout} className='hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 md:block'>
              <i aria-hidden='true' className='ri-logout-box-r-line' /> Log out
            </button>
            <button type='button' aria-label='Menu' onClick={() => setMenuOpen(!menuOpen)} className='rounded-lg p-2 hover:bg-gray-100 md:hidden'>
              <i aria-hidden='true' className={menuOpen ? 'ri-close-line text-xl' : 'ri-menu-line text-xl'} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className='border-t border-gray-100 px-4 py-2 md:hidden' onClick={() => setMenuOpen(false)}>
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}><i aria-hidden='true' className={link.icon} />{link.label}</NavLink>
            ))}
            <button type='button' onClick={onLogout} className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100'>
              <i aria-hidden='true' className='ri-logout-box-r-line' /> Log out
            </button>
          </nav>
        )}
      </header>
      <main className='mx-auto max-w-6xl px-4 py-6'>
        <Outlet />
      </main>
    </div>
  )
}
