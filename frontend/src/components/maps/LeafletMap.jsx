import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Polyline, ZoomControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const ICONS = { pickup: 'ri-map-pin-user-fill', destination: 'ri-flag-2-fill', driver: 'ri-steering-2-fill' }

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const markerIcon = (kind, label) => L.divIcon({
  // The driver's marker moves smoothly between updates.
  className: kind === 'driver' ? 'marker-glide' : '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  html: `<div class="map-marker map-marker--${kind}"><span class="map-marker__pin"><i class="${ICONS[kind] || ICONS.pickup}"></i></span>${label ? `<span class="map-marker__label">${escapeHtml(label)}</span>` : ''}</div>`,
})

// Roughly 100 m: the view is refitted when something moves further than this.
const rounded = (value) => value.toFixed(3)

// The part of the map a MapShell panel covers: the left side on desktop, the lower part on phones.
const overlayPadding = (map) => (window.innerWidth >= 1024
  ? { paddingTopLeft: [500, 60], paddingBottomRight: [60, 60] }
  : { paddingTopLeft: [40, 40], paddingBottomRight: [40, Math.round(map.getSize().y * 0.62)] })

function FitBounds({ points, path, center, overlaid }) {
  const map = useMap()
  const key = `${points.map((p) => `${rounded(p.lat)},${rounded(p.lng)}`).join('|')}#${path?.length || 0}`

  useEffect(() => {
    const all = [...points.map((p) => [p.lat, p.lng]), ...(path || [])]
    const padding = overlaid ? overlayPadding(map) : { padding: [48, 48] }
    if (all.length === 0 && center) map.fitBounds([[center.lat, center.lng]], { ...padding, maxZoom: 12 })
    else if (all.length === 1) map.fitBounds(all, { ...padding, maxZoom: 15 })
    else if (all.length > 1) map.fitBounds(all, { ...padding, maxZoom: 16 })
    // Refit only when the points move noticeably or the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])

  return null
}

function Markers({ points }) {
  return points.map((point) => <PointMarker key={point.kind} point={point} />)
}

function PointMarker({ point }) {
  const icon = useMemo(() => markerIcon(point.kind, point.label), [point.kind, point.label])
  return <Marker position={[point.lat, point.lng]} icon={icon} keyboard={false} zIndexOffset={point.kind === 'driver' ? 1000 : 0} />
}

export default function LeafletMap({ points, path, center, overlaid }) {
  const start = points[0] || center
  return (
    <MapContainer center={[start.lat, start.lng]} zoom={13} scrollWheelZoom={Boolean(overlaid)} zoomControl={false} className='h-full w-full'>
      <ZoomControl position='topright' />
      {/* Free OpenStreetMap tiles: fine for testing and light use; production uses Google Maps. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        maxZoom={19}
      />
      {path?.length > 1 && (
        <>
          <Polyline positions={path} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
          <Polyline positions={path} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
          <Polyline positions={path} pathOptions={{ color: '#ffffff', weight: 2, opacity: 0.9, dashArray: '2 18', lineCap: 'round', className: 'route-flow' }} />
        </>
      )}
      <Markers points={points} />
      <FitBounds points={points} path={path} center={center} overlaid={overlaid} />
    </MapContainer>
  )
}
