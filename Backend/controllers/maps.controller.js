const mapService = require('../services/maps.service');
const httpError = require('../utils/httpError');

module.exports.getSuggestions = async (req, res) => {
    try {
        return res.status(200).json(await mapService.getSuggestions(req.validated.query.input));
    } catch (err) {
        console.error('Address suggestions failed', err.message);
        throw httpError(502, 'Address suggestions are unavailable right now');
    }
}

module.exports.reverseGeocode = async (req, res) => {
    const { lat, lng } = req.validated.query;

    try {
        return res.status(200).json({ address: await mapService.reverseGeocode(lat, lng), lat, lng });
    } catch (err) {
        console.error('Reverse geocoding failed', err.message);
        throw httpError(502, 'Could not find an address for your location');
    }
}

module.exports.geocode = async (req, res) => {
    const place = await mapService.resolvePlace({ address: req.validated.query.address });
    const [ lng, lat ] = place.location.coordinates;
    return res.status(200).json({ address: place.address, lat, lng });
}

module.exports.getRoute = async (req, res) => {
    const { fromLat, fromLng, toLat, toLng } = req.validated.query;

    try {
        return res.status(200).json(await mapService.getRoutePath({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }));
    } catch (err) {
        console.error('Route lookup failed', err.message);
        throw httpError(502, 'Could not find a route between these places');
    }
}
