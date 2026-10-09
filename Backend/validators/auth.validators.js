const { z, phone, password, fullname, placeInput } = require('./common');

const email = z.string().trim().toLowerCase().email('Enter a valid email');

module.exports.registerSchema = z.object({ fullname, email, phone, password });

module.exports.loginSchema = z.object({
    role: z.enum([ 'customer', 'driver', 'admin' ]),
    email,
    password: z.string().min(1, 'Enter your password')
});

module.exports.forgotPasswordSchema = z.object({
    role: z.enum([ 'customer', 'driver', 'admin' ]),
    email
});

module.exports.resetPasswordSchema = z.object({
    role: z.enum([ 'customer', 'driver', 'admin' ]),
    token: z.string().length(64, 'Invalid or expired reset link'),
    password
});

module.exports.updateCustomerSchema = z.object({
    fullname: fullname.optional(),
    phone: phone.optional()
}).refine(data => Object.keys(data).length > 0, 'Nothing to update');

module.exports.savedLocationSchema = z.object({
    label: z.string().trim().min(1, 'Enter a label').max(40),
    place: placeInput
});
