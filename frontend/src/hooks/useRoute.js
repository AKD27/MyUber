import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

// About 100 m, so a moving driver does not trigger a new route lookup on every position update.
const rounded = (value) => Number(value.toFixed(3))

// The road route between two { lat, lng } points: { distanceKm, durationMinutes, path }.
// Returns nothing until both points are known; a failed lookup just means no line on the map.
export function useRoute(from, to) {
  const ready = Boolean(from && to)
  const key = ready ? [rounded(from.lat), rounded(from.lng), rounded(to.lat), rounded(to.lng)] : []

  const { data } = useQuery({
    queryKey: ['route', ...key],
    queryFn: () => api.get('/maps/route', { params: { fromLat: key[0], fromLng: key[1], toLat: key[2], toLng: key[3] } }).then((res) => res.data),
    enabled: ready,
    staleTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: keepPreviousData,
  })

  return ready ? data : undefined
}
