const nodemailer = require('nodemailer');
const { smtp } = require('../config/env');

const transporter = smtp.host
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined
    })
    : null;

// Sends through SMTP when configured; otherwise prints the message so development works without email.
module.exports.sendEmail = async ({ to, subject, text }) => {
    if (!transporter) {
        console.log(`\n[email not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
        return;
    }

    await transporter.sendMail({ from: smtp.from, to, subject, text });
}
