const express = require('express');
const path = require('path');
const cors = require('cors');
// Force fresh Vercel rebuild trigger
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const connectDB = require('./config/database');
connectDB();

// Import models
const User = require('./models/User');
const Student = require('./models/Student');
const Notice = require('./models/Notice');
const Room = require('./models/Room');
const Outpass = require('./models/Outpass');
const aiService = require('./services/ai');


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

// Register user (students only)
app.post('/api/register', async (req, res) => {
  const { name, email, password, usn, phone, address, parentPhone } = req.body;
  
  if (!name || !email || !password || !usn || !phone || !address || !parentPhone) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Check if USN already exists
    const existingUSN = await User.findOne({ usn: usn.toUpperCase() });
    if (existingUSN) {
      return res.status(409).json({ error: 'USN already registered' });
    }
    
    // Validate USN format
    const usnPattern = /^4YG[0-9]{2}[A-Z]{2}[0-9]{3}$/;
    if (!usnPattern.test(usn.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Invalid USN format. Use format like: 4YG23CS300' 
      });
    }
    
    // Validate phone numbers
    const phonePattern = /^[0-9]{10}$/;
    if (!phonePattern.test(phone)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format. Use 10 digits only.' 
      });
    }
    
    if (!phonePattern.test(parentPhone)) {
      return res.status(400).json({ 
        error: 'Invalid parent phone number format. Use 10 digits only.' 
      });
    }
    
    const passwordHash = bcrypt.hashSync(password, 10);
    
    // Create user
    const user = await User.create({
      role: 'student',
      name,
      email: email.toLowerCase(),
      passwordHash,
      usn: usn.toUpperCase(),
      phone,
      address,
      parentPhone
    });
    
    // Create student profile
    await Student.create({
      userId: user._id,
      name,
      email: email.toLowerCase(),
      usn: usn.toUpperCase(),
      phone,
      address,
      parentPhone,
      roomNumber: 'Not Assigned',
      feesStatus: 'Pending',
      feesDue: 0,
      totalFee: 0,
      paid: 0,
      status: 'active',
      attendance: []
    });
    
    res.json({ 
      id: usn.toUpperCase(), 
      role: 'student', 
      usn: usn.toUpperCase() 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login (student or warden)
app.post('/api/login', async (req, res) => {
  const { email, password, usn } = req.body;
  
  try {
    let user;
    if (usn) {
      user = await User.findOne({ usn: usn.toUpperCase() });
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      return res.status(400).json({ error: 'Email or USN required' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ 
      id: user.usn || user._id.toString(), 
      role: user.role, 
      name: user.name, 
      email: user.email,
      usn: user.usn || null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Forgot password endpoint
app.post('/api/forgot-password', async (req, res) => {
  const { email, usn, newPassword } = req.body;
  
  if (!email || !usn || !newPassword) {
    return res.status(400).json({ 
      error: 'Email, USN, and new password are required' 
    });
  }
  
  try {
    const user = await User.findOne({ 
      email: email.toLowerCase(), 
      usn: usn.toUpperCase() 
    });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'No account found with this email and USN combination' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }
    
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Notices
app.get('/api/notices', async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json(notices.map(n => ({
      id: n._id.toString(),
      title: n.title,
      body: n.body,
      createdAt: n.createdAt.getTime()
    })));
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ error: 'Failed to fetch notices' });
  }
});

app.post('/api/notices', async (req, res) => {
  const { title, body } = req.body;
  
  if (!title || !body) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  try {
    await Notice.create({ title, body });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error creating notice:', error);
    res.status(500).json({ error: 'Failed to create notice' });
  }
});

app.delete('/api/notice/:id', async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ error: 'Failed to delete notice' });
  }
});

// Assign room
app.post('/api/assign-room', async (req, res) => {
  const { studentEmail, studentUSN, roomNumber } = req.body;
  
  if ((!studentEmail && !studentUSN) || !roomNumber) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  try {
    let student;
    if (studentUSN) {
      student = await Student.findOne({ usn: studentUSN.toUpperCase() });
    } else {
      student = await Student.findOne({ email: studentEmail.toLowerCase() });
    }
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Find room to get sharing type
    const room = await Room.findOne({ number: roomNumber });
    
    // Set fee based on room sharing type
    let totalFee = 90000; // Default for 4-sharing
    if (room && room.sharingType === '2-sharing') {
      totalFee = 109000;
    } else if (room && room.sharingType === '4-sharing') {
      totalFee = 90000;
    }
    
    const currentPaid = student.paid || 0;
    const feesDue = totalFee - currentPaid;
    const feesStatus = feesDue === 0 ? 'Paid' : 'Pending';
    
    student.roomNumber = roomNumber;
    student.totalFee = totalFee;
    student.feesDue = feesDue;
    student.feesStatus = feesStatus;
    await student.save();
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error assigning room:', error);
    res.status(500).json({ error: 'Failed to assign room' });
  }
});

// Get all students with pagination
app.get('/api/students', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { usn: { $regex: search, $options: 'i' } },
          { roomNumber: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    res.json({
      students: students.map(s => ({
        id: s.usn,
        name: s.name,
        email: s.email,
        usn: s.usn,
        phone: s.phone,
        address: s.address,
        parentPhone: s.parentPhone,
        roomNumber: s.roomNumber,
        feesStatus: s.feesStatus,
        feesDue: s.feesDue,
        totalFee: s.totalFee,
        paid: s.paid,
        status: s.status,
        attendance: s.attendance
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalStudents: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        limit: limit
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get database (for dashboard data)
app.get('/api/db', async (req, res) => {
  try {
    const students = await Student.find();
    const notices = await Notice.find().sort({ createdAt: -1 });
    const rooms = await Room.find();
    const outpasses = await Outpass.find();
    
    const studentsObj = {};
    students.forEach(s => {
      studentsObj[s.usn] = {
        id: s.usn,
        name: s.name,
        email: s.email,
        usn: s.usn,
        phone: s.phone,
        address: s.address,
        parentPhone: s.parentPhone,
        roomNumber: s.roomNumber,
        feesStatus: s.feesStatus,
        feesDue: s.feesDue,
        totalFee: s.totalFee,
        paid: s.paid,
        status: s.status,
        attendance: s.attendance
      };
    });
    
    res.json({
      students: studentsObj,
      notices: notices.map(n => ({
        id: n._id.toString(),
        title: n.title,
        body: n.body,
        createdAt: n.createdAt.getTime()
      })),
      rooms: rooms.map(r => ({
        number: r.number,
        sharingType: r.sharingType,
        capacity: r.capacity,
        floor: r.floor
      })),
      outpasses: outpasses.map(o => ({
        id: o._id.toString(),
        studentId: o.studentId,
        studentName: o.studentName,
        reason: o.reason,
        fromDate: o.fromDate,
        toDate: o.toDate,
        status: o.status,
        createdAt: o.createdAt.getTime()
      }))
    });
  } catch (error) {
    console.error('Error fetching database:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Outpass APIs
app.get('/api/outpass', async (req, res) => {
  try {
    const role = req.query.role;
    const studentId = req.query.studentId;
    
    let query = {};
    if (role === 'student' && studentId) {
      query = { studentId };
    }
    
    const outpasses = await Outpass.find(query).sort({ createdAt: -1 });
    res.json(outpasses.map(o => ({
      id: o._id.toString(),
      studentId: o.studentId,
      studentName: o.studentName,
      reason: o.reason,
      fromDate: o.fromDate,
      toDate: o.toDate,
      status: o.status,
      createdAt: o.createdAt.getTime()
    })));
  } catch (error) {
    console.error('Error fetching outpasses:', error);
    res.status(500).json({ error: 'Failed to fetch outpasses' });
  }
});

app.post('/api/outpass', async (req, res) => {
  const { studentId, studentName, reason, fromDate, toDate } = req.body;
  
  if (!studentId || !reason || !fromDate || !toDate) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  try {
    const outpass = await Outpass.create({
      studentId,
      studentName: studentName || studentId,
      reason,
      fromDate,
      toDate,
      status: 'pending'
    });
    
    res.json({
      id: outpass._id.toString(),
      studentId: outpass.studentId,
      studentName: outpass.studentName,
      reason: outpass.reason,
      fromDate: outpass.fromDate,
      toDate: outpass.toDate,
      status: outpass.status,
      createdAt: outpass.createdAt.getTime()
    });
  } catch (error) {
    console.error('Error creating outpass:', error);
    res.status(500).json({ error: 'Failed to create outpass' });
  }
});

app.put('/api/outpass/:id', async (req, res) => {
  const { status } = req.body;
  
  if (!['approved', 'rejected', 'pending'].includes(String(status))) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    const outpass = await Outpass.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!outpass) {
      return res.status(404).json({ error: 'Outpass not found' });
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating outpass:', error);
    res.status(500).json({ error: 'Failed to update outpass' });
  }
});

// Get student by ID
app.get('/api/student/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ usn: req.params.id });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({
      id: student.usn,
      name: student.name,
      email: student.email,
      usn: student.usn,
      phone: student.phone,
      address: student.address,
      parentPhone: student.parentPhone,
      roomNumber: student.roomNumber,
      feesStatus: student.feesStatus,
      feesDue: student.feesDue,
      totalFee: student.totalFee,
      paid: student.paid,
      status: student.status,
      attendance: student.attendance
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// Update student
app.put('/api/student/:id', async (req, res) => {
  const { name, email, phone, address, parentPhone, roomNumber, feesStatus, feesDue } = req.body;
  
  try {
    const student = await Student.findOne({ usn: req.params.id });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Validate phone numbers if provided
    if (phone && !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format. Use 10 digits only.' 
      });
    }
    
    if (parentPhone && !/^[0-9]{10}$/.test(parentPhone)) {
      return res.status(400).json({ 
        error: 'Invalid parent phone number format. Use 10 digits only.' 
      });
    }
    
    // Update fields
    if (name) student.name = name;
    if (email) student.email = email;
    if (phone) student.phone = phone;
    if (address) student.address = address;
    if (parentPhone) student.parentPhone = parentPhone;
    if (roomNumber !== undefined) student.roomNumber = roomNumber;
    if (feesStatus) student.feesStatus = feesStatus;
    if (feesDue !== undefined) student.feesDue = feesDue;
    
    await student.save();
    
    // Also update user data
    const user = await User.findOne({ usn: req.params.id });
    if (user) {
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      if (address) user.address = address;
      if (parentPhone) user.parentPhone = parentPhone;
      await user.save();
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// Delete student
app.delete('/api/student/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ usn: req.params.id });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Delete student
    await Student.deleteOne({ usn: req.params.id });
    
    // Delete user
    await User.deleteOne({ usn: req.params.id });
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Update fee endpoint
app.put('/api/fee/:studentId', async (req, res) => {
  const { totalFee, paid } = req.body;
  
  try {
    const student = await Student.findOne({ usn: req.params.studentId });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const finalTotalFee = totalFee !== undefined ? totalFee : student.totalFee;
    const finalPaid = paid !== undefined ? paid : student.paid;
    const finalFeesDue = finalTotalFee - finalPaid;
    const finalFeesStatus = finalFeesDue === 0 ? 'Paid' : 'Pending';
    
    student.totalFee = finalTotalFee;
    student.paid = finalPaid;
    student.feesDue = finalFeesDue;
    student.feesStatus = finalFeesStatus;
    await student.save();
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ error: 'Failed to update fee' });
  }
});

// Attendance APIs
function normalizeDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

app.get('/api/attendance/:studentId', async (req, res) => {
  try {
    const student = await Student.findOne({ usn: req.params.studentId });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json(student.attendance || []);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

app.get('/api/attendance', async (req, res) => {
  const date = normalizeDate(req.query.date || Date.now());
  
  if (!date) {
    return res.status(400).json({ error: 'Invalid date' });
  }
  
  try {
    const students = await Student.find();
    
    const result = students.map(s => {
      const rec = s.attendance.find(r => r.date === date);
      return {
        id: s.usn,
        name: s.name,
        email: s.email,
        usn: s.usn,
        status: rec ? rec.status : null
      };
    });
    
    res.json({ date, attendance: result });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

app.put('/api/attendance/:studentId', async (req, res) => {
  const { date, status } = req.body;
  const normalized = normalizeDate(date);
  
  if (!normalized) {
    return res.status(400).json({ error: 'Invalid date' });
  }
  
  if (!['present', 'absent'].includes(String(status))) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    const student = await Student.findOne({ usn: req.params.studentId });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const idx = student.attendance.findIndex(r => r.date === normalized);
    if (idx === -1) {
      student.attendance.push({ date: normalized, status });
    } else {
      student.attendance[idx].status = status;
    }
    
    await student.save();
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// Get rooms with dynamic occupancy calculation
app.get('/api/rooms', async (req, res) => {
  try {
    const students = await Student.find();
    const rooms = await Room.find();
    
    // Count room occupancy
    const roomOccupancy = {};
    students.forEach(student => {
      if (student.roomNumber && student.roomNumber !== 'Not Assigned') {
        if (!roomOccupancy[student.roomNumber]) {
          roomOccupancy[student.roomNumber] = 0;
        }
        roomOccupancy[student.roomNumber]++;
      }
    });
    
    // Calculate dynamic occupancy for each room
    const roomsWithOccupancy = rooms.map(room => {
      const occupied = roomOccupancy[room.number] || 0;
      const status = occupied >= room.capacity ? 'full' : 'available';
      
      return {
        number: room.number,
        capacity: room.capacity,
        sharingType: room.sharingType,
        floor: room.floor,
        occupied,
        status
      };
    });
    
    res.json(roomsWithOccupancy);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Room management endpoints
app.put('/api/room/:roomNumber', async (req, res) => {
  const { sharingType, capacity, floor } = req.body;
  const roomNumber = req.params.roomNumber;
  
  try {
    let room = await Room.findOne({ number: roomNumber });
    
    if (!room) {
      room = await Room.create({
        number: roomNumber,
        sharingType: sharingType || '2-sharing',
        capacity: capacity || 2,
        floor: floor || 1
      });
    } else {
      if (sharingType) room.sharingType = sharingType;
      if (capacity) room.capacity = capacity;
      if (floor) room.floor = floor;
      await room.save();
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

app.post('/api/room', async (req, res) => {
  const { number, sharingType, capacity, floor } = req.body;
  
  try {
    const existingRoom = await Room.findOne({ number });
    if (existingRoom) {
      return res.status(409).json({ error: 'Room already exists' });
    }
    
    await Room.create({
      number,
      sharingType: sharingType || '2-sharing',
      capacity: capacity || 2,
      floor: floor || 1
    });
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.delete('/api/room/:roomNumber', async (req, res) => {
  const roomNumber = req.params.roomNumber;
  
  try {
    const room = await Room.findOne({ number: roomNumber });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if any students are assigned to this room
    const studentsInRoom = await Student.countDocuments({ roomNumber });
    if (studentsInRoom > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete room with assigned students' 
      });
    }
    
    await Room.deleteOne({ number: roomNumber });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// AI Features Endpoints
app.post('/api/ai/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    const result = await aiService.getChatbotResponse(message, history || []);
    res.json(result);
  } catch (error) {
    console.error('Error in chatbot route:', error);
    res.status(500).json({ error: 'Failed to process chatbot request' });
  }
});

app.post('/api/ai/staff-assistant', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    const result = await aiService.getStaffAssistantResponse(message, history || []);
    res.json(result);
  } catch (error) {
    console.error('Error in staff assistant route:', error);
    res.status(500).json({ error: 'Failed to process staff assistant request' });
  }
});

app.get('/api/ai/billing-summary/:studentId', async (req, res) => {
  try {
    const student = await Student.findOne({ usn: req.params.studentId.toUpperCase() });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const room = await Room.findOne({ number: student.roomNumber });
    
    // Calculate attendance stats
    const totalDays = student.attendance ? student.attendance.length : 0;
    const presentCount = student.attendance ? student.attendance.filter(a => a.status === 'present').length : 0;
    const attendanceStats = {
      total: totalDays,
      present: presentCount,
      rate: totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0
    };
    
    const result = await aiService.getBillingSummary(student, room, attendanceStats);
    
    // Parse result.text into JSON for structured rendering
    try {
      const parsedData = JSON.parse(result.text);
      res.json({ data: parsedData, isMock: result.isMock });
    } catch (parseError) {
      console.warn('[Billing Summary] Failed to parse JSON, returning raw text:', parseError.message);
      res.json({ text: result.text, isMock: result.isMock });
    }
  } catch (error) {
    console.error('Error in billing summary route:', error);
    res.status(500).json({ error: 'Failed to generate billing summary' });
  }
});

app.post('/api/ai/classify-complaint', async (req, res) => {
  const { subject, description } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required' });
  }
  try {
    const result = await aiService.classifyComplaint(subject, description);
    try {
      res.json(JSON.parse(result.text));
    } catch (err) {
      res.json({ category: 'other', urgency: 'low', justification: 'Default classification due to parsing failure.' });
    }
  } catch (error) {
    console.error('Error classifying complaint:', error);
    res.status(500).json({ error: 'Failed to classify complaint' });
  }
});

app.post('/api/ai/outpass-risk', async (req, res) => {
  const { studentId, reason, fromDate, toDate } = req.body;
  if (!studentId || !reason || !fromDate || !toDate) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const student = await Student.findOne({ usn: studentId.toUpperCase() });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const pastCount = await Outpass.countDocuments({ studentId: studentId.toUpperCase() });
    const result = await aiService.getOutpassRisk(student, { reason, fromDate, toDate }, pastCount);
    try {
      res.json(JSON.parse(result.text));
    } catch (err) {
      res.json({ riskLevel: 'low', recommendation: 'approve', justification: 'Default risk scoring.' });
    }
  } catch (error) {
    console.error('Error in outpass risk route:', error);
    res.status(500).json({ error: 'Failed to assess outpass risk' });
  }
});

app.post('/api/ai/polish-notice', async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }
  try {
    const result = await aiService.polishNotice(title, body);
    try {
      res.json(JSON.parse(result.text));
    } catch (err) {
      res.json({ title, body });
    }
  } catch (error) {
    console.error('Error in notice polisher route:', error);
    res.status(500).json({ error: 'Failed to polish notice' });
  }
});

app.get('/api/ai/attendance-alerts', async (req, res) => {
  try {
    const students = await Student.find();
    const flagged = [];
    
    students.forEach(student => {
      const records = student.attendance || [];
      const total = records.length;
      if (total > 0) {
        const present = records.filter(r => r.status === 'present').length;
        const rate = Math.round((present / total) * 100);
        
        let consecutiveAbsences = 0;
        let maxConsecutive = 0;
        const sortedAtt = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
        sortedAtt.forEach(r => {
          if (r.status === 'absent') {
            consecutiveAbsences++;
            if (consecutiveAbsences > maxConsecutive) {
              maxConsecutive = consecutiveAbsences;
            }
          } else {
            consecutiveAbsences = 0;
          }
        });
        
        if (rate < 75 || maxConsecutive >= 3) {
          flagged.push({
            name: student.name,
            usn: student.usn,
            rate: rate,
            consecutiveAbsences: maxConsecutive
          });
        }
      }
    });
    
    if (flagged.length === 0) {
      return res.json({ summary: "AI scanned attendance registries. No anomalies detected.", alerts: [] });
    }
    
    const result = await aiService.getAttendanceAlerts(flagged);
    try {
      res.json(JSON.parse(result.text));
    } catch (err) {
      res.json({ summary: "Failed to parse alerts from AI.", alerts: [] });
    }
  } catch (error) {
    console.error('Error generating attendance alerts:', error);
    res.status(500).json({ error: 'Failed to generate attendance alerts' });
  }
});

app.get('/api/ai/monthly-report', async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const rooms = await Room.find();
    const totalRooms = rooms.length;
    const students = await Student.find();
    
    const roomOccupancy = {};
    students.forEach(s => {
      if (s.roomNumber && s.roomNumber !== 'Not Assigned') {
        roomOccupancy[s.roomNumber] = (roomOccupancy[s.roomNumber] || 0) + 1;
      }
    });
    const occupiedRoomsCount = Object.keys(roomOccupancy).length;
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const occupiedBeds = Object.values(roomOccupancy).reduce((sum, val) => sum + val, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;
    
    const totalDuesPending = students.filter(s => s.feesStatus !== 'Paid').length;
    const totalRevenue = students.reduce((sum, s) => sum + (s.totalFee || 0), 0);
    const totalCollected = students.reduce((sum, s) => sum + (s.paid || 0), 0);
    const totalOutstanding = students.reduce((sum, s) => sum + (s.feesDue || 0), 0);
    
    const outpassCount = await Outpass.countDocuments();
    const pendingOutpasses = await Outpass.countDocuments({ status: 'pending' });
    
    const stats = {
      totalStudents,
      totalRooms,
      occupiedRoomsCount,
      occupancyRate,
      totalRevenue,
      totalCollected,
      totalOutstanding,
      totalDuesPending,
      outpassCount,
      pendingOutpasses
    };
    
    const result = await aiService.generateMonthlyReport(stats);
    res.json({ text: result.text, isMock: result.isMock });
  } catch (error) {
    console.error('Error in monthly report route:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});


// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));


// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hostel backend listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: http://192.168.31.105:${PORT}`);
    if (process.env.NODE_ENV === 'production') {
      console.log('Production mode: Static files served');
    }
  });
}

module.exports = app;

