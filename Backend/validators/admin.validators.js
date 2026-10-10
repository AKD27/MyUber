const { z } = require('./common');
const { BOOKING_STATUS, DRIVER_VERIFICATION, ACCOUNT_STATUS, COMPLAINT_STATUS } = require('../config/constants');

const page = z.coerce.number().int().min(1).default(1);
const search = z.string().trim().max(100).optional();

module.exports.listDriversSchema = z.object({
    verificationStatus: z.enum(Object.values(DRIVER_VERIFICATION)).optional(),
    accountStatus: z.enum(ACCOUNT_STATUS).optional(),
    search,
    page
});

module.exports.listCustomersSchema = z.object({ accountStatus: z.enum(ACCOUNT_STATUS).optional(), search, page });

module.exports.listBookingsSchema = z.object({ status: z.enum(Object.values(BOOKING_STATUS)).optional(), page });

module.exports.verificationSchema = z.object({
    status: z.enum([ DRIVER_VERIFICATION.UNDER_REVIEW, DRIVER_VERIFICATION.VERIFIED, DRIVER_VERIFICATION.REJECTED ]),
    note: z.string().trim().max(500).optional()
}).refine(data => data.status !== DRIVER_VERIFICATION.REJECTED || data.note, { path: [ 'note' ], message: 'Tell the driver why they were rejected' });

module.exports.accountStatusSchema = z.object({ accountStatus: z.enum(ACCOUNT_STATUS) });

module.exports.adminCancelSchema = z.object({ reason: z.string().trim().min(3, 'Give a reason for cancelling').max(300) });

module.exports.listComplaintsSchema = z.object({ status: z.enum(COMPLAINT_STATUS).optional(), page });

module.exports.listSosSchema = z.object({ status: z.enum([ 'open', 'resolved' ]).optional(), page });
