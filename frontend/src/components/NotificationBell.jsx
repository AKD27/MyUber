import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { timeAgo } from '../lib/format'
import { Icon } from './ui'
import { cx } from '../lib/cx'

// The bell in the header: unread count and the latest messages for a customer or driver.
export default function NotificationBell({ bookingPath }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const root = useRef(null)

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/support/notifications').then((res) => res.data),
    refetchInterval: 60 * 1000,
  })

  const markRead = useMutation({
    mutationFn: () => api.post('/support/notifications/read'),
    onSuccess: () => queryClient.setQueryData(['notifications'], (old) => old && { ...old, unread: 0 }),
  })

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

  const unread = data?.unread || 0

  const toggle = () => {
    setOpen(!open)
    if (!open && unread > 0) markRead.mutate()
  }

  const openBooking = (notification) => {
    setOpen(false)
    if (notification.booking) navigate(bookingPath(notification.booking))
  }

  return (
    <div ref={root} className='relative'>
      <button type='button' onClick={toggle} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open}
        className='relative flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'>
        <Icon name='ri-notification-3-line' />
        {unread > 0 && <span className='absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white'>{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className='absolute right-0 top-12 z-[700] w-[min(22rem,calc(100vw-2rem))] animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift'>
          <p className='border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900'>Notifications</p>
          <ul className='max-h-96 overflow-y-auto'>
            {!data?.items.length && (
              <li className='px-4 py-10 text-center text-sm text-slate-500'>
                <Icon name='ri-notification-off-line' className='mb-1 block text-2xl text-slate-300' />Nothing yet. Booking updates appear here.
              </li>
            )}
            {data?.items.map((notification) => (
              <li key={notification._id}>
                <button type='button' onClick={() => openBooking(notification)}
                  className={cx('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50', !notification.booking && 'cursor-default')}>
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', notification.readAt ? 'bg-slate-200' : 'bg-brand-500')} />
                  <span className='min-w-0 flex-1'>
                    <span className='block text-sm leading-snug text-slate-800'>{notification.message}</span>
                    <span className='mt-0.5 block text-xs text-slate-400'>{timeAgo(notification.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
