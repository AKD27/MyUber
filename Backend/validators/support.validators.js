const { z, objectId } = require('./common');
const { COMPLAINT_CATEGORIES, COMPLAINT_STATUS } = require('../config/constants');

module.exports.complaintSchema = z.object({
    bookingId: objectId.optional(),
    category: z.enum(COMPLAINT_CATEGORIES),
    description: z.string().trim().min(10, 'Describe what happened in at least 10 characters').max(2000)
});

module.exports.complaintUpdateSchema = z.object({
    status: z.enum(COMPLAINT_STATUS),
    resolutionNote: z.string().trim().max(1000).optional()
}).refine(data => data.status !== 'resolved' || data.resolutionNote, { path: [ 'resolutionNote' ], message: 'Add a note explaining how this was resolved' });

module.exports.sosSchema = z.object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional()
});

module.exports.sosResolveSchema = z.object({ resolutionNote: z.string().trim().min(3, 'Add a note about what was done').max(1000) });

module.exports.shareTokenParams = z.object({ token: z.string().regex(/^[0-9a-f]{40}$/, 'This link is not valid') });
