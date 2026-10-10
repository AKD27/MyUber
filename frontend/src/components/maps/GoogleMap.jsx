import { useEffect, useRef, useState } from 'react'

// Used in production when VITE_MAPS_PROVIDER=google and VITE_GOOGLE_MAPS_KEY are set.
// Draws the same markers and route line as the OpenStreetMap version.

const COLORS = { pickup: '#059669', destination: '#0f172a', driver: '#2563eb' }

let loading

// Loads the Google Maps script once for the whole app.
const loadGoogleMaps = () => {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps)

  loading ||= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(import.meta.env.VITE_GOOGLE_MAPS_KEY)}&v=weekly`
    script.async = true
    script.onload = () => (window.google?.maps?.Map ? resolve(window.google.maps) : reject(new Error('Google Maps did not load')))
    script.onerror = () => reject(new Error('Google Maps did not load'))
    document.head.appendChild(script)
  })

  return loading
}

const rounded = (value) => value.toFixed(3)

export default function GoogleMap({ points, path, center, overlaid }) {
  const start = points[0] || center
  const container = useRef(null)
  const map = useRef(null)
  const drawn = useRef([])
  const [maps, setMaps] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    loadGoogleMaps().then((api) => active && setMaps(api)).catch(() => active && setFailed(true))
    return () => { active = false }
  }, [])

  const viewKey = `${points.map((p) => `${rounded(p.lat)},${rounded(p.lng)}`).join('|')}#${path?.length || 0}`

  // The arrays are new on every render, so compare what they contain.
  const drawKey = `${JSON.stringify(points)}#${path?.length || 0}`

  // Markers and the route are redrawn whenever they change.
  useEffect(() => {
    if (!maps || !container.current) return

    map.current ||= new maps.Map(container.current, {
      center: { lat: start.lat, lng: start.lng },
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'cooperative',
      clickableIcons: false,
    })

    drawn.current.forEach((item) => item.setMap(null))
    drawn.current = []

    if (path?.length > 1) {
      drawn.current.push(new maps.Polyline({
        map: map.current,
        path: path.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: '#0f172a',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      }))
    }

    for (const point of points) {
      drawn.current.push(new maps.Marker({
        map: map.current,
        position: { lat: point.lat, lng: point.lng },
        title: point.label,
        zIndex: point.kind === 'driver' ? 10 : 1,
        label: point.label ? { text: point.label, className: 'google-marker-label', fontSize: '11px', fontWeight: '600' } : undefined,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: COLORS[point.kind] || COLORS.pickup,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps, drawKey])

  // The view is refitted only when something moves noticeably or the route changes.
  useEffect(() => {
    if (!maps || !map.current) return

    const all = [...points.map((p) => ({ lat: p.lat, lng: p.lng })), ...(path || []).map(([lat, lng]) => ({ lat, lng }))]

    // Leave room for the panel a MapShell lays over the map.
    const padding = !overlaid ? 48 : window.innerWidth >= 1024
      ? { left: 500, top: 60, right: 60, bottom: 60 }
      : { left: 40, top: 40, right: 40, bottom: Math.round(container.current.clientHeight * 0.62) }

    if (all.length === 0) {
      if (center) { map.current.setCenter(center); map.current.setZoom(12) }
    } else if (all.length === 1) {
      map.current.setCenter(all[0])
      map.current.setZoom(15)
    } else {
      const bounds = new maps.LatLngBounds()
      all.forEach((position) => bounds.extend(position))
      map.current.fitBounds(bounds, padding)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps, viewKey])

  if (failed) {
    return <div className='flex h-full items-center justify-center p-6 text-center text-sm text-slate-500'>The map could not be loaded. Check the Google Maps key.</div>
  }

  return <div ref={container} className='h-full w-full' />
}
