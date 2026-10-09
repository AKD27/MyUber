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
    }

    const onAccount = ({ message }) => {
      if (message) toast(message, 'info')
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] })
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] })
      useAuth.getState().load()
    }

    socket.on('booking:request', onBooking)
    socket.on('booking:updated', onBooking)
    socket.on('account:updated', onAccount)

    return () => {
      socket.off('booking:request', onBooking)
      socket.off('booking:updated', onBooking)
      socket.off('account:updated', onAccount)
    }
  }, [status, queryClient])
}
