const { isProduction, clientUrl } = require('../config/env');
const userModel = require('../models/user.model');
const driverModel = require('../models/driver.model');
const blacklistTokenModel = require('../models/blacklistToken.model');
const { modelForRole } = require('../middlewares/auth.middleware');
const { sendEmail } = require('../services/email.service');
const httpError = require('../utils/httpError');

const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000
};

const startSession = (res, account, role, status = 200) => {
    res.cookie('token', account.generateAuthToken(role), COOKIE_OPTIONS);
    return res.status(status).json({ role, account });
}

// Customers and admins share the users collection, told apart by their role field.
const findAccountQuery = (role, email) => role === 'driver' ? { email } : { email, role };

module.exports.registerCustomer = async (req, res) => {
    const { fullname, email, phone, password } = req.validated.body;

    const customer = await userModel.create({
        fullname, email, phone, role: 'customer',
        password: await userModel.hashPassword(password)
    });

    return startSession(res, customer, 'customer', 201);
}

module.exports.registerDriver = async (req, res) => {
    const { fullname, email, phone, password } = req.validated.body;

    const driver = await driverModel.create({
        fullname, email, phone,
        password: await driverModel.hashPassword(password)
    });

    return startSession(res, driver, 'driver', 201);
}

module.exports.login = async (req, res) => {
    const { role, email, password } = req.validated.body;
    const model = modelForRole(role);

    const account = await model.findOne(findAccountQuery(role, email)).select('+password');

    if (!account || !(await account.comparePassword(password))) {
        throw httpError(401, 'Invalid email or password');
    }

    if (account.accountStatus === 'suspended') {
        throw httpError(403, 'Your account is suspended. Please contact support.');
    }

    return startSession(res, account, role);
}

module.exports.logout = async (req, res) => {
    await blacklistTokenModel.updateOne(
        { token: req.auth.token },
        { $setOnInsert: { token: req.auth.token } },
        { upsert: true }
    );

    res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: undefined });
    return res.status(200).json({ message: 'Logged out' });
}

module.exports.me = async (req, res) => {
    return res.status(200).json({ role: req.auth.role, account: req.auth.account });
}

// Always answers the same way so the response does not reveal which emails are registered.
module.exports.forgotPassword = async (req, res) => {
    const { role, email } = req.validated.body;
    const account = await modelForRole(role).findOne(findAccountQuery(role, email));

    if (account) {
        const token = account.createPasswordResetToken();
        await account.save();

        const link = `${clientUrl}/reset-password?role=${role}&token=${token}`;
        await sendEmail({
            to: account.email,
            subject: 'Reset your Driver on Demand password',
            text: `Hi ${account.fullname.firstname},\n\nReset your password using this link (valid for 30 minutes):\n${link}\n\nIf you did not ask for this, ignore this email.`
        });
    }

    return res.status(200).json({ message: 'If an account exists for this email, a reset link has been sent.' });
}

module.exports.resetPassword = async (req, res) => {
    const { role, token, password } = req.validated.body;
    const model = modelForRole(role);

    const account = await model.findByResetToken(token);

    if (!account || (account.role && account.role !== role)) {
        throw httpError(400, 'This reset link is invalid or has expired');
    }

    account.password = await model.hashPassword(password);
    account.passwordReset = undefined;
    await account.save();

    return res.status(200).json({ message: 'Password updated. You can log in now.' });
}
