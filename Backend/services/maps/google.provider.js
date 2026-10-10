// Google Maps Platform: Geocoding, Distance Matrix and Places Autocomplete. Needs GOOGLE_MAPS_API.
const axios = require('axios');

module.exports.getAddressCoordinate = async (address) => {
    const apiKey = process.env.GOOGLE_MAPS_API;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK') {
            const location = response.data.results[ 0 ].geometry.location;
            return {
                ltd: location.lat,
                lng: location.lng
            };
        } else {
            throw new Error('Unable to fetch coordinates');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    const apiKey = process.env.GOOGLE_MAPS_API;

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

    try {


        const response = await axios.get(url);
        if (response.data.status === 'OK') {

            if (response.data.rows[ 0 ].elements[ 0 ].status === 'ZERO_RESULTS') {
                throw new Error('No routes found');
            }

            return response.data.rows[ 0 ].elements[ 0 ];
        } else {
            throw new Error('Unable to fetch distance and time');
        }

    } catch (err) {
        console.error(err);
        throw err;
    }
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('query is required');
    }

    const apiKey = process.env.GOOGLE_MAPS_API;
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        if (response.data.status === 'OK') {
            return response.data.predictions.map(prediction => prediction.description).filter(value => value).map(label => ({ label }));
        } else {
            throw new Error('Unable to fetch suggestions');
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
}

module.exports.reverseGeocode = async (lat, lng) => {
    const apiKey = process.env.GOOGLE_MAPS_API;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    const response = await axios.get(url);

    if (response.data.status !== 'OK' || !response.data.results.length) {
        throw new Error('Unable to find an address for this location');
    }

    return response.data.results[ 0 ].formatted_address;
}

// Driving distance and duration between two { ltd, lng } points.
module.exports.getRoute = (from, to) => module.exports.getDistanceTime(`${from.ltd},${from.lng}`, `${to.ltd},${to.lng}`);

// Decodes Google's encoded polyline format into [ lat, lng ] pairs.
const decodePolyline = (encoded) => {
    const path = [];
    let index = 0, lat = 0, lng = 0;

    const nextValue = () => {
        let result = 0, shift = 0, byte;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        return (result & 1) ? ~(result >> 1) : (result >> 1);
    };

    while (index < encoded.length) {
        lat += nextValue();
        lng += nextValue();
        path.push([ lat / 1e5, lng / 1e5 ]);
    }

    return path;
}

module.exports.decodePolyline = decodePolyline;

// Driving route between two { ltd, lng } points with the line to draw on a map (Directions API).
module.exports.getRoutePath = async (from, to) => {
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
        params: {
            origin: `${from.ltd},${from.lng}`,
            destination: `${to.ltd},${to.lng}`,
            mode: 'driving',
            key: process.env.GOOGLE_MAPS_API
        }
    });

    const route = response.data?.routes?.[ 0 ];
    const leg = route?.legs?.[ 0 ];

    if (response.data?.status !== 'OK' || !leg) {
        throw new Error('No routes found');
    }

    return {
        distance: { value: leg.distance.value },
        duration: { value: leg.duration.value },
        path: decodePolyline(route.overview_polyline.points)
    };
}
