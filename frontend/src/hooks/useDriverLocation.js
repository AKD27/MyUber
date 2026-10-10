import { useEffect } from 'react'
import { socket } from '../lib/socket'

// Idle drivers refresh their position now and then; during a booking the customer is watching the map.
const INTERVAL_MS = { idle: 30 * 1000, live: 5 * 1000 }

// Shares the driver's position with the server while `mode` is 'idle' or 'live' (nothing when falsy).
export function useDriverLocation(mode) {
  useEffect(() => {
    if (!mode || !navigator.geolocation) return

    let lastSent = 0

    const send = (position) => {
      if (Date.now() - lastSent < INTERVAL_MS[mode] - 500) return
      lastSent = Date.now()
      socket.emit('driver:location', { lat: position.coords.latitude, lng: position.coords.longitude })
    }

    // Permission denied or no signal: the last known position (or the profile's base location) is used.
    const ignore = () => {}
    const options = { enableHighAccuracy: mode === 'live', maximumAge: INTERVAL_MS[mode], timeout: 20 * 1000 }

    const watch = navigator.geolocation.watchPosition(send, ignore, options)
    // watchPosition stays quiet while the device is still, so also send on a timer.
    const timer = setInterval(() => navigator.geolocation.getCurrentPosition(send, ignore, options), INTERVAL_MS[mode])

    return () => {
      navigator.geolocation.clearWatch(watch)
      clearInterval(timer)
    }
  }, [mode])
}
