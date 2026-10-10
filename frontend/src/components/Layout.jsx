import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, homeFor } from '../store/auth'
import { fullName } from '../lib/format'
import Avatar from './Avatar'
import NotificationBell from './NotificationBell'
import { Icon } from './ui'
import { cx } from '../lib/cx'

// `tab: true` links also appear in the phone's bottom bar (at most four fit comfortably).
const NAV = {
  customer: [
    { to: '/book', label: 'Book', icon: 'ri-steering-2-line', activeIcon: 'ri-steering-2-fill', tab: true },
    { to: '/bookings', label: 'Bookings', icon: 'ri-calendar-check-line', activeIcon: 'ri-calendar-check-fill', tab: true },
    { to: '/support', label: 'Support', icon: 'ri-customer-service-2-line', activeIcon: 'ri-customer-service-2-fill', tab: true },
    { to: '/profile', label: 'Profile', icon: 'ri-user-3-line', activeIcon: 'ri-user-3-fill', tab: true },
  ],
  driver: [
    { to: '/driver', label: 'Home', icon: 'ri-home-5-line', activeIcon: 'ri-home-5-fill', end: true, tab: true },
    { to: '/driver/bookings', label: 'Bookings', icon: 'ri-calendar-check-line', activeIcon: 'ri-calendar-check-fill', tab: true },
    { to: '/driver/earnings', label: 'Earnings', icon: 'ri-wallet-3-line', activeIcon: 'ri-wallet-3-fill', tab: true },
    { to: '/driver/profile', label: 'Profile', icon: 'ri-id-card-line', activeIcon: 'ri-id-card-fill', tab: true },
    { to: '/driver/support', label: 'Support', icon: 'ri-customer-service-2-line', activeIcon: 'ri-customer-service-2-fill' },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: 'ri-dashboard-line', activeIcon: 'ri-dashboard-fill', end: true },
    { to: '/admin/drivers', label: 'Drivers', icon: 'ri-steering-2-line', activeIcon: 'ri-steering-2-fill' },
    { to: '/admin/customers', label: 'Customers', icon: 'ri-group-line', activeIcon: 'ri-group-fill' },
    { to: '/admin/bookings', label: 'Bookings', icon: 'ri-file-list-3-line', activeIcon: 'ri-file-list-3-fill' },
    { to: '/admin/complaints', label: 'Complaints', icon: 'ri-feedback-line', activeIcon: 'ri-feedback-fill' },
    { to: '/admin/safety', label: 'Safety alerts', icon: 'ri-alarm-warning-line', activeIcon: 'ri-alarm-warning-fill' },
  ],
}

export function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className={cx('flex shrink-0 items-center gap-2 rounded-lg text-base font-extrabold tracking-tight sm:gap-2.5 sm:text-[17px]', light ? 'text-white' : 'text-slate-900')}>
      <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg text-[17px]', light ? 'bg-white text-slate-950' : 'bg-slate-950 text-white')}><Icon name='ri-steering-2-fill' /></span>
      <span className='max-[340px]:hidden'>Driver on Demand</span>
    </Link>
  )
}

function AccountMenu({ onLogout, profilePath, supportPath }) {
  const { account, role } = useAuth()
  const [open, setOpen] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClick = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className='relative'>
      <button type='button' onClick={() => setOpen(!open)} aria-label='Account menu' aria-expanded={open}
        className='flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-slate-100'>
        <Avatar person={account} size='h-8 w-8' className='text-xs' />
        <span className='hidden max-w-32 truncate text-sm font-semibold text-slate-800 sm:block'>{account.fullname.firstname}</span>
        <Icon name='ri-arrow-down-s-line' className='hidden text-slate-400 sm:block' />
      </button>
      {open && (
        <div className='absolute right-0 top-12 z-[700] w-60 animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lift'>
          <div className='border-b border-slate-100 px-4 pb-3 pt-2'>
            <p className='truncate text-sm font-bold text-slate-900'>{fullName(account)}</p>
            <p className='truncate text-xs text-slate-500'>{account.email}</p>
            <p className='mt-1 text-[11px] font-bold uppercase tracking-wider text-brand-700'>{role}</p>
          </div>
          {profilePath && (
            <Link to={profilePath} onClick={() => setOpen(false)} className='flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50'>
              <Icon name='ri-user-settings-line' className='text-base text-slate-400' /> Profile settings
            </Link>
          )}
          {supportPath && (
            <Link to={supportPath} onClick={() => setOpen(false)} className='flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50'>
              <Icon name='ri-customer-service-2-line' className='text-base text-slate-400' /> Help and support
            </Link>
          )}
          <button type='button' onClick={onLogout} className='flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50'>
            <Icon name='ri-logout-box-r-line' className='text-base' /> Log out
          </button>
        </div>
      )}
    </div>
  )
}

// Customers and drivers: a top bar, plus a bottom tab bar on phones.
function AppShell({ role, links, onLogout }) {
  const account = useAuth((state) => state.account)
  const { pathname } = useLocation()
  const desktopLink = ({ isActive }) => cx('flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
    isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-500 hover:text-slate-950')

  return (
    <div className='min-h-dvh bg-slate-50'>
      <header className='sticky top-0 z-[500] border-b border-slate-200 bg-white'>
        <div className='mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4'>
          <Logo to={homeFor(role, account)} />
          <nav aria-label='Main' className='hidden items-center gap-1 lg:flex'>
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={desktopLink}><Icon name={link.icon} />{link.label}</NavLink>
            ))}
          </nav>
          <div className='flex items-center gap-1'>
            <NotificationBell bookingPath={(id) => (role === 'driver' ? `/driver/bookings/${id}` : `/bookings/${id}`)} />
            <AccountMenu onLogout={onLogout} profilePath={role === 'driver' ? '/driver/profile' : '/profile'} supportPath={role === 'driver' ? '/driver/support' : '/support'} />
          </div>
        </div>
      </header>

      {/* Each page fades in; keyed by path so it replays on navigation. Opacity only: a transform here would break the full-screen map pages. */}
      <main key={pathname} className='animate-fade-in mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-12'>
        <Outlet />
      </main>

      <nav aria-label='Main' className='pb-safe fixed inset-x-0 bottom-0 z-[500] border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden'>
        <div className='mx-auto flex max-w-md'>
          {links.filter((link) => link.tab).map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}
              className={({ isActive }) => cx('relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] transition-colors active:scale-95', isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-400')}>
              {({ isActive }) => (<><span aria-hidden='true' className={cx('absolute top-0 h-0.5 w-8 rounded-full bg-slate-900 transition-opacity duration-200', isActive ? 'opacity-100' : 'opacity-0')} /><Icon name={isActive ? link.activeIcon : link.icon} className='text-2xl' />{link.label}</>)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

// Admins: a sidebar on desktop, a slide-in drawer on phones.
function AdminShell({ links, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setDrawerOpen(false), [location.pathname])

  const sidebar = (
    <div className='flex h-full flex-col bg-slate-900 text-slate-300'>
      <div className='flex h-16 items-center px-5'><Logo to='/admin' light /></div>
      <p className='px-5 pb-2 pt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500'>Admin console</p>
      <nav aria-label='Admin' className='flex-1 space-y-1 px-3'>
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end}
            className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors', isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white')}>
            {({ isActive }) => (<><Icon name={isActive ? link.activeIcon : link.icon} className={cx('text-lg', isActive && 'text-brand-400')} />{link.label}</>)}
          </NavLink>
        ))}
      </nav>
      <button type='button' onClick={onLogout} className='m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-white/5 hover:text-white'>
        <Icon name='ri-logout-box-r-line' className='text-lg' /> Log out
      </button>
    </div>
  )

  return (
    <div className='min-h-dvh bg-slate-50 lg:pl-64'>
      <aside className='fixed inset-y-0 left-0 z-[600] hidden w-64 lg:block'>{sidebar}</aside>

      {drawerOpen && (
        <div className='fixed inset-0 z-[900] lg:hidden'>
          <div className='absolute inset-0 animate-fade-in bg-slate-900/50' onClick={() => setDrawerOpen(false)} />
          <aside className='absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-lift'>{sidebar}</aside>
        </div>
      )}

      <header className='sticky top-0 z-[500] flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md lg:px-8'>
        <button type='button' aria-label='Open menu' onClick={() => setDrawerOpen(true)} className='flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-700 hover:bg-slate-100 lg:hidden'>
          <Icon name='ri-menu-line' />
        </button>
        <p className='text-sm font-semibold text-slate-500 max-lg:hidden'>Driver on Demand · Operations</p>
        <AccountMenu onLogout={onLogout} />
      </header>

      <main key={location.pathname} className='animate-enter mx-auto max-w-7xl px-4 py-6 lg:px-8'>
        <Outlet />
      </main>
    </div>
  )
}

export default function Layout() {
  const { role, logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Logged-out visitors are redirected by the page guards; render nothing for them here.
  if (!role) return <Outlet />

  return role === 'admin'
    ? <AdminShell links={NAV.admin} onLogout={onLogout} />
    : <AppShell role={role} links={NAV[role]} onLogout={onLogout} />
}
