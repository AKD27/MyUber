// A stored place ({ address, location }) as a map marker.
export const placePoint = (place, label, kind) => place?.location?.coordinates
  ? { lat: place.location.coordinates[1], lng: place.location.coordinates[0], label, kind }
  : null

// A place being entered in a form ({ address, lat?, lng? }) as a map marker, once it has coordinates.
export const inputPoint = (place, label, kind) => (Number.isFinite(place?.lat) && Number.isFinite(place?.lng)
  ? { lat: place.lat, lng: place.lng, label, kind }
  : null)

// Opens turn-by-turn directions to a place in the phone's maps app.
export const directionsUrl = (point) => `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=driving`
