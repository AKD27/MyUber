const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config/env');
const { ACCOUNT_STATUS } = require('../../config/constants');

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

// Fields and behaviour shared by customer/admin and driver accounts.
module.exports = function accountPlugin(schema) {
    schema.add({
        fullname: {
            firstname: { type: String, required: true, trim: true, minlength: 2 },
            lastname: { type: String, trim: true }
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [ /^\S+@\S+\.\S+$/, 'Please enter a valid email' ]
        },
        phone: { type: String, required: true, trim: true },
        password: { type: String, required: true, select: false },
        accountStatus: { type: String, enum: ACCOUNT_STATUS, default: 'active' },
        rating: {
            average: { type: Number, default: 0 },
            count: { type: Number, default: 0 }
        },
        passwordReset: {
            tokenHash: { type: String, select: false },
            expiresAt: { type: Date, select: false }
        }
    });

    schema.statics.hashPassword = (password) => bcrypt.hash(password, 10);

    schema.methods.comparePassword = function (password) {
        return bcrypt.compare(password, this.password);
    };

    schema.methods.generateAuthToken = function (role) {
        return jwt.sign({ _id: this._id, role }, jwtSecret, { expiresIn: '24h' });
    };

    // Returns the plain token to send to the user; only its hash is stored.
    schema.methods.createPasswordResetToken = function () {
        const token = crypto.randomBytes(32).toString('hex');
        this.passwordReset = {
            tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS)
        };
        return token;
    };

    schema.statics.findByResetToken = function (token) {
        return this.findOne({
            'passwordReset.tokenHash': crypto.createHash('sha256').update(token).digest('hex'),
            'passwordReset.expiresAt': { $gt: new Date() }
        });
    };

    // Folds one new rating into the running average.
    schema.statics.addRating = function (id, stars) {
        return this.findByIdAndUpdate(id, [
            {
                $set: {
                    'rating.average': {
                        $round: [ {
                            $divide: [
                                { $add: [ { $multiply: [ '$rating.average', '$rating.count' ] }, stars ] },
                                { $add: [ '$rating.count', 1 ] }
                            ]
                        }, 2 ]
                    },
                    'rating.count': { $add: [ '$rating.count', 1 ] }
                }
            }
        ], { new: true });
    };

    // Never leak secrets in API responses.
    schema.set('toJSON', {
        transform: (doc, ret) => {
            delete ret.password;
            delete ret.passwordReset;
            delete ret.__v;
            return ret;
        }
    });
};
