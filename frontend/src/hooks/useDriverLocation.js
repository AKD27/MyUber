import { useEffect } from 'react'
import { socket } from '../lib/socket'

const SHARE_EVERY_MS = 30 * 1000

// While a driver is online, keep their position fresh so nearby customers can find them.
export function useDriverLocation(enabled) {
  useEffect(() => {
    if (!enabled || !navigator.geolocation) return

    const share = () => navigator.geolocation.getCurrentPosition(
      (position) => socket.emit('driver:location', { lat: position.coords.latitude, lng: position.coords.longitude }),
      () => { /* permission denied: the base location from the profile is used */ },
      { maximumAge: 60 * 1000, timeout: 15 * 1000 },
    )

    share()
    const timer = setInterval(share, SHARE_EVERY_MS)
    return () => clearInterval(timer)
  }, [enabled])
}
