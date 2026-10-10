const httpError = require('../utils/httpError');

// MAPS_PROVIDER picks the geocoding/routing backend: 'google' (paid, needs GOOGLE_MAPS_API) or
// 'osm' (free OpenStreetMap services, no key). Defaults to google only when a key is configured.
const providerName = (process.env.MAPS_PROVIDER || (process.env.GOOGLE_MAPS_API ? 'google' : 'osm')).toLowerCase();

const providers = {
    google: () => require('./maps/google.provider'),
    osm: () => require('./maps/osm.provider')
};

if (!providers[ providerName ]) {
    throw new Error(`Unknown MAPS_PROVIDER "${providerName}", expected "google" or "osm"`);
}

const provider = providers[ providerName ]();

module.exports.providerName = providerName;

module.exports.getAddressCoordinate = (address) => provider.getAddressCoordinate(address);

module.exports.getDistanceTime = (origin, destination) => provider.getDistanceTime(origin, destination);

// [{ label, lat?, lng? }]; coordinates are included when the provider returns them.
module.exports.getSuggestions = (input) => provider.getAutoCompleteSuggestions(input);

module.exports.reverseGeocode = (lat, lng) => provider.reverseGeocode(lat, lng);

const toPoint = (lat, lng) => ({ type: 'Point', coordinates: [ lng, lat ] });

module.exports.toPoint = toPoint;

// Turns { address, lat?, lng? } into a stored place, geocoding the address when coordinates are missing.
module.exports.resolvePlace = async ({ address, lat, lng }) => {
    if (typeof lat === 'number' && typeof lng === 'number') {
        return { address, location: toPoint(lat, lng) };
    }

    try {
        const coordinates = await provider.getAddressCoordinate(address);
        return { address, location: toPoint(coordinates.ltd, coordinates.lng) };
    } catch (err) {
        throw httpError(400, `Could not find the location "${address}". Pick an address from the suggestions.`);
    }
}

// Road distance/time between two stored places, or null if routing is unavailable (never blocks a booking).
module.exports.estimateRoute = async (fromPlace, toPlace) => {
    const point = (place) => ({ ltd: place.location.coordinates[ 1 ], lng: place.location.coordinates[ 0 ] });

    try {
        const route = await provider.getRoute(point(fromPlace), point(toPlace));
        return {
            distanceKm: Math.round(route.distance.value / 100) / 10,
            durationMinutes: Math.round(route.duration.value / 60)
        };
    } catch (err) {
        console.error('Route estimate failed', err.message);
        return null;
    }
}

// Road route between two { lat, lng } points, with the line to draw on the map.
module.exports.getRoutePath = async (from, to) => {
    const route = await provider.getRoutePath({ ltd: from.lat, lng: from.lng }, { ltd: to.lat, lng: to.lng });

    return {
        distanceKm: Math.round(route.distance.value / 100) / 10,
        durationMinutes: Math.max(1, Math.round(route.duration.value / 60)),
        path: route.path
    };
}
