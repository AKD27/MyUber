module.exports = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
    }

    if (err.code === 11000) {
        const message = err.keyPattern?.email ? 'An account with this email already exists' : 'This already exists';
        return res.status(409).json({ message });
    }

    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({ message: err.message });
    }

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid JSON body' });
    }

    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
}
