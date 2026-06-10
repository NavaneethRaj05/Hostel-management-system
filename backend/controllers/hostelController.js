const User = require('../models/User');

async function getStudentProfile(req, res) {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user || user.role !== 'student') return res.status(404).json({ error: 'Student not found' });
        return res.json({ name: user.name, email: user.email, student: user.student });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
}

async function assignRoom(req, res) {
    try {
        const { studentEmail, roomNumber } = req.body;
        if (!studentEmail || !roomNumber) return res.status(400).json({ error: 'Missing fields' });
        const user = await User.findOne({ email: studentEmail.toLowerCase(), role: 'student' });
        if (!user) return res.status(404).json({ error: 'Student not found' });
        user.student.roomNumber = roomNumber;
        await user.save();
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
}

module.exports = { getStudentProfile, assignRoom };

