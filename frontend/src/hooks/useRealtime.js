import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { socket } from '../lib/socket'
import { useAuth } from '../store/auth'
import { toast } from '../store/toast'

// Live updates from the server: refresh affected data and show the message.
export function useRealtime() {
  const queryClient = useQueryClient()
  const status = useAuth((state) => state.status)

  useEffect(() => {
    if (status !== 'authenticated') return

    const onBooking = ({ message, booking }) => {
      if (message) toast(message, 'info')
      queryClient.setQueryData(['booking', booking._id], booking)
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['driver-earnings'] })
    }

    // The driver moved: update the open booking without refetching it.
    const onLocation = ({ bookingId, lat, lng, at }) => {
      queryClient.setQueryData(['booking', bookingId], (booking) => booking && { ...booking, driverLocation: { lat, lng, updatedAt: at } })
    }

    const onNotification = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })

    const onAccount = ({ message }) => {
      if (message) toast(message, 'info')
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] })
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] })
      useAuth.getState().load()
    }

    // Something needs an admin's attention: SOS, a complaint or a driver waiting for review.
    const onAdminAlert = ({ type, message }) => {
      toast(message, type === 'sos' ? 'error' : 'info')
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: [{ sos: 'admin-sos', complaint: 'admin-complaints', verification: 'admin-drivers' }[type]] })
    }

    const onError = ({ message }) => { if (message) toast(message, 'error') }

    const handlers = {
      'booking:request': onBooking,
      'booking:updated': onBooking,
      'booking:location': onLocation,
      'notification:new': onNotification,
      'account:updated': onAccount,
      'admin:alert': onAdminAlert,
      'app:error': onError,
    }

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler))
    return () => Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler))
  }, [status, queryClient])
}
