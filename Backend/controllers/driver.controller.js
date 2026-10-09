const driverService = require('../services/driver.service');
const bookingService = require('../services/booking.service');

const withProfileStatus = (driver) => ({
    account: driver,
    missingFields: driverService.missingProfileFields(driver)
});

module.exports.getMyProfile = async (req, res) => {
    return res.status(200).json(withProfileStatus(req.auth.account));
}

module.exports.updateMyProfile = async (req, res) => {
    const driver = await driverService.updateProfile(req.auth.account, req.validated.body);
    return res.status(200).json(withProfileStatus(driver));
}

module.exports.submitForVerification = async (req, res) => {
    const driver = await driverService.submitForVerification(req.auth.account);
    return res.status(200).json(withProfileStatus(driver));
}

module.exports.setAvailability = async (req, res) => {
    const driver = await driverService.setAvailability(req.auth.account, req.validated.body.isOnline);
    return res.status(200).json({ isOnline: driver.isOnline });
}

module.exports.updateLocation = async (req, res) => {
    const driver = req.auth.account;
    const { lat, lng } = req.validated.body;

    driver.location = { type: 'Point', coordinates: [ lng, lat ] };
    driver.locationUpdatedAt = new Date();
    await driver.save();

    return res.status(200).json({ location: driver.location });
}

module.exports.getDashboard = async (req, res) => {
    return res.status(200).json(await bookingService.getDriverDashboard(req.auth.account));
}

module.exports.searchDrivers = async (req, res) => {
    return res.status(200).json(await bookingService.searchDrivers(req.validated.body));
}

module.exports.getPublicProfile = async (req, res) => {
    return res.status(200).json(await driverService.getPublicProfile(req.validated.params.id));
}
