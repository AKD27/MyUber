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
