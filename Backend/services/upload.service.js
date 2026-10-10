const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const { publicUrl } = require('../config/env');
const httpError = require('../utils/httpError');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

// The file's real type is read from its first bytes, never from the name or header the browser sent.
const SIGNATURES = [
    { extension: 'jpg', matches: (b) => b[ 0 ] === 0xff && b[ 1 ] === 0xd8 && b[ 2 ] === 0xff },
    { extension: 'png', matches: (b) => b.subarray(0, 8).equals(Buffer.from([ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ])) },
    { extension: 'webp', matches: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' }
];

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } }).single('photo');

// Express middleware that reads one image from the "photo" form field into req.file.
module.exports.receivePhoto = (req, res, next) => upload(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return next(httpError(400, 'The photo must be smaller than 3 MB'));
    if (err) return next(httpError(400, 'Could not read the uploaded photo'));
    return next();
});

module.exports.UPLOAD_DIR = UPLOAD_DIR;

const isOwnUpload = (url) => typeof url === 'string' && url.startsWith(`${publicUrl}/uploads/`);

// Deletes a photo this server stored earlier; links to other sites are left alone.
module.exports.removePhoto = async (url) => {
    if (isOwnUpload(url)) {
        await fs.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {});
    }
}

// Stores an uploaded image under a random name and returns its public address.
module.exports.savePhoto = async (file) => {
    if (!file?.buffer?.length) {
        throw httpError(400, 'Choose a photo to upload');
    }

    const type = SIGNATURES.find(signature => signature.matches(file.buffer));

    if (!type) {
        throw httpError(400, 'Upload a JPG, PNG or WebP image');
    }

    const name = `${crypto.randomBytes(16).toString('hex')}.${type.extension}`;

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, name), file.buffer);

    return `${publicUrl}/uploads/${name}`;
}
