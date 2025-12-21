const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
    return jwt.sign(
        { id: user._id.toString(), role: user.role, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );
}

async function register(req, res) {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'name, email, password, role are required' });
        }
        if (!['student', 'warden'].includes(role)) {
            return res.status(400).json({ error: 'role must be student or warden' });
        }
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(409).json({ error: 'Email already registered' });
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role });
        const token = signToken(user);
        return res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
        const token = signToken(user);
        return res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
}

module.exports = { register, login };

