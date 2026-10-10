// Free OpenStreetMap services for development and testing; no API key needed.
// Photon (https://photon.komoot.io) does geocoding and autocomplete, OSRM
// (https://project-osrm.org) does driving distance and duration. The public servers are
// rate limited and meant for light use; point PHOTON_URL / OSRM_URL at your own instances
// for anything heavier.
const axios = require('axios');

const PHOTON_URL = process.env.PHOTON_URL || 'https://photon.komoot.io';
const OSRM_URL = process.env.OSRM_URL || 'https://router.project-osrm.org';

const http = axios.create({
    timeout: 10000,
    headers: { 'User-Agent': 'MyUber/1.0 (development)' }
});

// Builds a readable one-line address from Photon's properties, e.g. "MG Road, Shanthala Nagar, Bengaluru, Karnataka, India".
const formatPhotonFeature = (feature) => {
    const p = feature.properties || {};
    const street = [ p.housenumber, p.street ].filter(Boolean).join(' ');
    const parts = [ p.name, street, p.district, p.city, p.state, p.country ].filter(Boolean);

    return [ ...new Set(parts) ].join(', ');
}

const searchPhoton = async (query, limit) => {
    const response = await http.get(`${PHOTON_URL}/api/`, {
        params: { q: query, limit }
    });

    return response.data?.features || [];
}

module.exports.getAddressCoordinate = async (address) => {
    const [ feature ] = await searchPhoton(address, 1);

    if (!feature) {
        throw new Error('Unable to fetch coordinates');
    }

    const [ lng, ltd ] = feature.geometry.coordinates;

    return { ltd, lng };
}

const formatDistance = (meters) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

const formatDuration = (seconds) => {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return minutes < 60 ? `${minutes} mins` : `${Math.floor(minutes / 60)} hours ${minutes % 60} mins`;
}

// Same shape as a Google Distance Matrix element, so fare calculation is provider independent.
module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    const [ from, to ] = await Promise.all([
        module.exports.getAddressCoordinate(origin),
        module.exports.getAddressCoordinate(destination)
    ]);

    return module.exports.getRoute(from, to);
}

// Driving distance and duration between two { ltd, lng } points.
module.exports.getRoute = async (from, to) => {
    const response = await http.get(
        `${OSRM_URL}/route/v1/driving/${from.lng},${from.ltd};${to.lng},${to.ltd}`,
        { params: { overview: 'false' } }
    );

    const route = response.data?.routes?.[ 0 ];

    if (response.data?.code !== 'Ok' || !route) {
        throw new Error('No routes found');
    }

    return {
        distance: { text: formatDistance(route.distance), value: Math.round(route.distance) },
        duration: { text: formatDuration(route.duration), value: Math.round(route.duration) },
        status: 'OK'
    };
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('query is required');
    }

    const features = await searchPhoton(input, 5);
    const seen = new Set();

    return features
        .map(feature => ({
            label: formatPhotonFeature(feature),
            lat: feature.geometry.coordinates[ 1 ],
            lng: feature.geometry.coordinates[ 0 ]
        }))
        .filter(suggestion => suggestion.label && !seen.has(suggestion.label) && seen.add(suggestion.label));
}

module.exports.reverseGeocode = async (lat, lng) => {
    const response = await http.get(`${PHOTON_URL}/reverse`, {
        params: { lat, lon: lng, limit: 1 }
    });

    const feature = response.data?.features?.[ 0 ];

    if (!feature) {
        throw new Error('Unable to find an address for this location');
    }

    return formatPhotonFeature(feature);
}

// Driving route between two { ltd, lng } points with the line to draw on a map, as [ lat, lng ] pairs.
module.exports.getRoutePath = async (from, to) => {
    const response = await http.get(
        `${OSRM_URL}/route/v1/driving/${from.lng},${from.ltd};${to.lng},${to.ltd}`,
        { params: { overview: 'simplified', geometries: 'geojson' } }
    );

    const route = response.data?.routes?.[ 0 ];

    if (response.data?.code !== 'Ok' || !route) {
        throw new Error('No routes found');
    }

    return {
        distance: { value: Math.round(route.distance) },
        duration: { value: Math.round(route.duration) },
        path: route.geometry.coordinates.map(([ lng, lat ]) => [ lat, lng ])
    };
}
