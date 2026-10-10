const { resolvePlace } = require('../services/maps.service');
const httpError = require('../utils/httpError');

const MAX_SAVED_LOCATIONS = 10;

module.exports.updateProfile = async (req, res) => {
    const customer = req.auth.account;
    const { fullname, phone, emergencyContact } = req.validated.body;

    if (fullname) customer.fullname = fullname;
    if (phone) customer.phone = phone;
    if (emergencyContact !== undefined) customer.emergencyContact = emergencyContact || undefined;
    await customer.save();

    return res.status(200).json({ account: customer });
}

module.exports.addSavedLocation = async (req, res) => {
    const customer = req.auth.account;

    if (customer.savedLocations.length >= MAX_SAVED_LOCATIONS) {
        throw httpError(400, `You can save up to ${MAX_SAVED_LOCATIONS} locations`);
    }

    const { label, place } = req.validated.body;
    customer.savedLocations.push({ label, place: await resolvePlace(place) });
    await customer.save();

    return res.status(201).json({ savedLocations: customer.savedLocations });
}

module.exports.deleteSavedLocation = async (req, res) => {
    const customer = req.auth.account;
    const location = customer.savedLocations.id(req.validated.params.id);

    if (!location) {
        throw httpError(404, 'Saved location not found');
    }

    location.deleteOne();
    await customer.save();

    return res.status(200).json({ savedLocations: customer.savedLocations });
}
