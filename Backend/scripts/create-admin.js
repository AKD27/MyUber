// Creates (or resets the password of) an admin account.
// Usage: npm run create-admin -- admin@example.com "a-strong-password" "First name"
const mongoose = require('mongoose');
const { dbConnect } = require('../config/env');
const userModel = require('../models/user.model');

const [ email, password, firstname = 'Admin' ] = process.argv.slice(2);

if (!email || !password || password.length < 8) {
    console.error('Usage: npm run create-admin -- <email> <password (8+ characters)> [first name]');
    process.exit(1);
}

(async () => {
    await mongoose.connect(dbConnect);

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await userModel.findOne({ email: normalizedEmail });

    if (existing && existing.role !== 'admin') {
        console.error(`${normalizedEmail} is already registered as a customer. Use a different email for the admin.`);
        process.exit(1);
    }

    const hashed = await userModel.hashPassword(password);

    if (existing) {
        existing.password = hashed;
        await existing.save();
        console.log(`Updated password for admin ${normalizedEmail}`);
    } else {
        await userModel.create({ email: normalizedEmail, password: hashed, role: 'admin', fullname: { firstname }, phone: '0000000000' });
        console.log(`Created admin ${normalizedEmail}`);
    }

    await mongoose.disconnect();
})().catch(err => {
    console.error(err.message);
    process.exit(1);
});
