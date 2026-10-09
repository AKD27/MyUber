// Validates and replaces req.body / req.query / req.params with the parsed Zod output.
module.exports = (schemas) => (req, res, next) => {
    const errors = [];

    for (const part of [ 'body', 'query', 'params' ]) {
        if (!schemas[ part ]) {
            continue;
        }

        const result = schemas[ part ].safeParse(req[ part ] ?? {});

        if (result.success) {
            req.validated = { ...req.validated, [ part ]: result.data };
        } else {
            errors.push(...result.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            })));
        }
    }

    if (errors.length) {
        return res.status(400).json({ message: errors[ 0 ].message, errors });
    }

    return next();
}
