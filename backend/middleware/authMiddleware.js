const jwt = require('jsonwebtoken');

function auth(requiredRoles = []) {
    return (req, res, next) => {
        try {
            const header = req.headers.authorization || '';
            const token = header.startsWith('Bearer ') ? header.slice(7) : null;
            if (!token) return res.status(401).json({ error: 'Missing token' });
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
}

module.exports = { auth };

