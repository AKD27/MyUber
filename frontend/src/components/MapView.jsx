import { lazy, Suspense } from 'react'
import { cx } from '../lib/cx'

// VITE_MAPS_PROVIDER picks the map: 'osm' (free OpenStreetMap tiles, for testing) or 'google'
// (needs VITE_GOOGLE_MAPS_KEY). Both draw the same props, so pages do not care which one is used.
const useGoogle = import.meta.env.VITE_MAPS_PROVIDER === 'google' && Boolean(import.meta.env.VITE_GOOGLE_MAPS_KEY)

const Provider = lazy(() => (useGoogle ? import('./maps/GoogleMap') : import('./maps/LeafletMap')))

const isPoint = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng)

// A map with markers ([{ lat, lng, label, kind: 'pickup' | 'destination' | 'driver' }]) and an optional
// route line (path: [[lat, lng], …]). Shows `placeholder` until there is something to show.
// With `fill` the map has no frame and leaves room for the panel a MapShell lays over it;
// `center` is what it shows before there is any marker.
export default function MapView({ points = [], path, className = 'h-64', placeholder, fill, center }) {
  const valid = points.filter(isPoint)

  return (
    // isolate keeps the map's internal z-indexes below the app's menus and dialogs.
    <div className={cx('relative isolate overflow-hidden bg-slate-100', fill ? 'h-full' : cx('rounded-2xl border border-slate-200/80', className))}>
      {valid.length === 0 && !center ? (
        <div className='flex h-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_1px_1px,theme(colors.slate.300)_1px,transparent_0)] bg-[length:20px_20px] p-6 text-center text-sm text-slate-500'>
          {placeholder}
        </div>
      ) : (
        <Suspense fallback={<div className='h-full animate-pulse bg-slate-200/70' />}>
          <Provider points={valid} path={path} center={center} overlaid={fill} />
        </Suspense>
      )}
    </div>
  )
}
