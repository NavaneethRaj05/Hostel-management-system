const express = require('express');
const { getStudentProfile, assignRoom } = require('../controllers/hostelController');
const { auth } = require('../middleware/authMiddleware');

const router = express.Router();

// Student profile routes
router.get('/student/:id', auth(['student', 'warden']), getStudentProfile);

// Room assignment routes
router.post('/assign-room', auth(['warden']), assignRoom);

module.exports = router;
