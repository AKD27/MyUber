// A stored place ({ address, location }) as a map marker.
export const placePoint = (place, label, kind) => place?.location?.coordinates
  ? { lat: place.location.coordinates[1], lng: place.location.coordinates[0], label, kind }
  : null
