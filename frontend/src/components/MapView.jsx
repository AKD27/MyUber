import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const COLORS = { pickup: '#0f766e', destination: '#111827', driver: '#2563eb' }

function FitBounds({ points }) {
  const map = useMap()
  const key = points.map((p) => `${p.lat},${p.lng}`).join('|')

  useEffect(() => {
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14)
    else if (points.length > 1) map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [30, 30] })
    // Refit only when the points change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])

  return null
}

// A small OpenStreetMap map with labelled markers: [{ lat, lng, label, kind }].
export default function MapView({ points, className = 'h-56' }) {
  const valid = points.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
  if (!valid.length) return null

  return (
    // z-0 keeps Leaflet's internal z-indexes below the app's menus and dialogs.
    <div className={`relative z-0 overflow-hidden rounded-xl border border-gray-200 ${className}`}>
      <MapContainer center={[valid[0].lat, valid[0].lng]} zoom={13} scrollWheelZoom={false} className='h-full w-full'>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {valid.map((point) => (
          <CircleMarker key={`${point.kind}-${point.lat}-${point.lng}`} center={[point.lat, point.lng]} radius={9}
            pathOptions={{ color: '#fff', weight: 3, fillColor: COLORS[point.kind] || COLORS.pickup, fillOpacity: 1 }}>
            <Tooltip permanent direction='top' offset={[0, -8]}>{point.label}</Tooltip>
          </CircleMarker>
        ))}
        <FitBounds points={valid} />
      </MapContainer>
    </div>
  )
}
