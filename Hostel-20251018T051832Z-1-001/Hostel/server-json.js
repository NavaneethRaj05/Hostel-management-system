const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

// Database configuration
const DB_PATH = path.join(__dirname, 'db.json');

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    const seed = {
      users: [
        // default warden
        { id: uuidv4(), role: 'warden', name: 'Warden', email: 'warden@hostel.org', passwordHash: bcrypt.hashSync('warden123', 10) }
      ],
      students: {},
      notices: [],
      requests: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDb(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

// Register user (students only)
app.post('/api/register', async (req, res) => {
  const { name, email, password, usn, phone, address, parentPhone } = req.body;
  if (!name || !email || !password || !usn || !phone || !address || !parentPhone) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  const db = loadDb();
  
  // Check if email already exists
  const existingEmail = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingEmail) return res.status(409).json({ error: 'Email already registered' });
  
  // Check if USN already exists
  const existingUSN = db.users.find(u => u.usn && u.usn.toUpperCase() === usn.toUpperCase());
  if (existingUSN) return res.status(409).json({ error: 'USN already registered' });
  
  // Validate USN format - YG college only, Year 4 only
  // Format: 4YG[Batch][Branch][Number]
  // Examples: 4YG23CS300, 4YG24IT123, 4YG25EC456, 4YG26ME789
  const usnPattern = /^4YG[0-9]{2}[A-Z]{2}[0-9]{3}$/;
  if (!usnPattern.test(usn.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid USN format. Use format like: 4YG23CS300 (Year: 4 only, College: YG, Batch: 2 digits, Branch: 2 letters, Number: 3 digits)' });
  }
  
  // Validate phone numbers
  const phonePattern = /^[0-9]{10}$/;
  if (!phonePattern.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format. Use 10 digits only.' });
  }
  
  if (!phonePattern.test(parentPhone)) {
    return res.status(400).json({ error: 'Invalid parent phone number format. Use 10 digits only.' });
  }
  
  const id = usn.toUpperCase(); // Use USN as ID
  const passwordHash = bcrypt.hashSync(password, 10);
  
  // Add user
  db.users.push({ 
    id, 
    role: 'student', 
    name, 
    email, 
    passwordHash, 
    usn: usn.toUpperCase(),
    phone,
    address,
    parentPhone
  });
  
  // Add student data
  db.students[id] = { 
    id,
    name, 
    email, 
    usn: usn.toUpperCase(),
    phone,
    address,
    parentPhone,
    roomNumber: 'Not Assigned', 
    feesStatus: 'Pending', 
    feesDue: 0,
    totalFee: 0, // Will be set when room is assigned
    paid: 0,
    status: 'active',
    attendance: []
  };
  
  saveDb(db);
  res.json({ id, role: 'student', usn: usn.toUpperCase() });
});


// Login (student or warden)
app.post('/api/login', (req, res) => {
  const { email, password, usn } = req.body;
  const db = loadDb();
  
  let user;
  if (usn) {
    // Login with USN
    user = db.users.find(u => u.usn && u.usn.toUpperCase() === usn.toUpperCase());
  } else if (email) {
    // Login with email
    user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  } else {
    return res.status(400).json({ error: 'Email or USN required' });
  }
  
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  
  res.json({ 
    id: user.id, 
    role: user.role, 
    name: user.name, 
    email: user.email,
    usn: user.usn || null
  });
});

// Forgot password endpoint
app.post('/api/forgot-password', (req, res) => {
  const { email, usn, newPassword } = req.body;
  
  if (!email || !usn || !newPassword) {
    return res.status(400).json({ error: 'Email, USN, and new password are required' });
  }
  
  const db = loadDb();
  
  // Find user by email and USN
  const user = db.users.find(u => 
    u.email.toLowerCase() === email.toLowerCase() && 
    u.usn && u.usn.toUpperCase() === usn.toUpperCase()
  );
  
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email and USN combination' });
  }
  
  // Validate new password
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  // Hash new password
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  
  // Update password
  user.passwordHash = passwordHash;
  
  // Also update in students data if it's a student
  if (user.role === 'student' && db.students[user.id]) {
    // Update any other fields if needed
    db.students[user.id] = { ...db.students[user.id] };
  }
  
  saveDb(db);
  res.json({ message: 'Password reset successful' });
});

// Student profile (moved to avoid duplication)

// Notices
app.get('/api/notices', (req, res) => {
  const db = loadDb();
  res.json(db.notices);
});

app.post('/api/notices', (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Missing fields' });
  const db = loadDb();
  db.notices.push({ id: uuidv4(), title, body, createdAt: Date.now() });
  saveDb(db);
  res.json({ ok: true });
});

// Assign room
app.post('/api/assign-room', (req, res) => {
  const { studentEmail, studentUSN, roomNumber } = req.body;
  if ((!studentEmail && !studentUSN) || !roomNumber) return res.status(400).json({ error: 'Missing fields' });
  const db = loadDb();
  
  let user;
  if (studentUSN) {
    // Find by USN
    user = db.users.find(u => u.role === 'student' && u.usn && u.usn.toUpperCase() === studentUSN.toUpperCase());
  } else {
    // Find by email
    user = db.users.find(u => u.role === 'student' && u.email.toLowerCase() === studentEmail.toLowerCase());
  }
  
  if (!user) return res.status(404).json({ error: 'Student not found' });
  
  // Find room to get sharing type
  let room = null;
  if (db.rooms && Array.isArray(db.rooms)) {
    room = db.rooms.find(r => String(r.number) === String(roomNumber));
  }
  
  // Set fee based on room sharing type
  let totalFee = 90000; // Default for 4-sharing
  if (room && room.sharingType === '2-sharing') {
    totalFee = 109000;
  } else if (room && room.sharingType === '4-sharing') {
    totalFee = 90000;
  }
  
  // Calculate fee status based on current paid amount
  const currentPaid = db.students[user.id].paid || 0;
  const feesDue = totalFee - currentPaid;
  const feesStatus = feesDue === 0 ? 'Paid' : 'Pending';
  
  db.students[user.id] = { 
    ...db.students[user.id], 
    roomNumber,
    totalFee,
    feesDue,
    feesStatus
  };
  saveDb(db);
  res.json({ ok: true });
});

// Get all students with pagination
app.get('/api/students', (req, res) => {
  const db = loadDb();
  
  // Get students with their IDs
  const studentsWithIds = Object.entries(db.students).map(([id, student]) => ({
    id,
    ...student
  }));
  
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  
  // Filter students based on search
  let filteredStudents = studentsWithIds;
  if (search) {
    filteredStudents = studentsWithIds.filter(student => 
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase()) ||
      (student.roomNumber && student.roomNumber.includes(search))
    );
  }
  
  // Calculate pagination
  const total = filteredStudents.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);
  
  res.json({
    students: paginatedStudents,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalStudents: total,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: limit
    }
  });
});

// Get database (for dashboard data)
app.get('/api/db', (req, res) => {
  const db = loadDb();
  
  // Add IDs to students for dashboard compatibility
  const studentsWithIds = Object.entries(db.students).map(([id, student]) => ({
    id,
    ...student
  }));
  
  const dbWithIds = {
    ...db,
    students: studentsWithIds
  };
  
  res.json(dbWithIds);
});

// Outpass APIs
// Ensure db.outpasses exists
function ensureOutpasses(db) {
  if (!db.outpasses) db.outpasses = [];
}

// List outpasses (warden: all, student: by id)
app.get('/api/outpass', (req, res) => {
  const db = loadDb();
  ensureOutpasses(db);
  const role = req.query.role;
  const studentId = req.query.studentId;
  if (role === 'student' && studentId) {
    return res.json(db.outpasses.filter(o => o.studentId === studentId));
  }
  res.json(db.outpasses);
});
// Compat: non-API prefix
app.get('/outpass', (req, res) => {
  req.query = req.query || {};
  const db = loadDb();
  ensureOutpasses(db);
  const role = req.query.role;
  const studentId = req.query.studentId;
  if (role === 'student' && studentId) {
    return res.json(db.outpasses.filter(o => o.studentId === studentId));
  }
  res.json(db.outpasses);
});

// Create outpass (student)
app.post('/api/outpass', (req, res) => {
  const { studentId, studentName, reason, fromDate, toDate } = req.body;
  if (!studentId || !reason || !fromDate || !toDate) return res.status(400).json({ error: 'Missing fields' });
  const db = loadDb();
  ensureOutpasses(db);
  const id = uuidv4();
  const record = {
    id,
    studentId,
    studentName: studentName || studentId,
    reason,
    fromDate,
    toDate,
    status: 'pending',
    createdAt: Date.now()
  };
  db.outpasses.push(record);
  saveDb(db);
  res.json(record);
});
// Compat: non-API prefix
app.post('/outpass', (req, res) => {
  const { studentId, studentName, reason, fromDate, toDate } = req.body;
  if (!studentId || !reason || !fromDate || !toDate) return res.status(400).json({ error: 'Missing fields' });
  const db = loadDb();
  ensureOutpasses(db);
  const id = uuidv4();
  const record = { id, studentId, studentName: studentName || studentId, reason, fromDate, toDate, status: 'pending', createdAt: Date.now() };
  db.outpasses.push(record);
  saveDb(db);
  res.json(record);
});

// Update outpass status (warden)
app.put('/api/outpass/:id', (req, res) => {
  const { status } = req.body;
  if (!['approved','rejected','pending'].includes(String(status))) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const db = loadDb();
  ensureOutpasses(db);
  const idx = db.outpasses.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Outpass not found' });
  db.outpasses[idx].status = status;
  saveDb(db);
  res.json({ ok: true });
});
// Compat: non-API prefix
app.put('/outpass/:id', (req, res) => {
  const { status } = req.body;
  if (!['approved','rejected','pending'].includes(String(status))) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const db = loadDb();
  ensureOutpasses(db);
  const idx = db.outpasses.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Outpass not found' });
  db.outpasses[idx].status = status;
  saveDb(db);
  res.json({ ok: true });
});

// Get student by ID
app.get('/api/student/:id', (req, res) => {
  const db = loadDb();
  const profile = db.students[req.params.id];
  if (!profile) return res.status(404).json({ error: 'Student not found' });
  res.json(profile);
});

// Update student
app.put('/api/student/:id', (req, res) => {
  const { name, email, phone, address, parentPhone, roomNumber, feesStatus, feesDue } = req.body;
  const db = loadDb();
  if (!db.students[req.params.id]) return res.status(404).json({ error: 'Student not found' });
  
  // Validate phone numbers if provided
  if (phone && !/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format. Use 10 digits only.' });
  }
  
  if (parentPhone && !/^[0-9]{10}$/.test(parentPhone)) {
    return res.status(400).json({ error: 'Invalid parent phone number format. Use 10 digits only.' });
  }
  
  // Update student data
  db.students[req.params.id] = { 
    ...db.students[req.params.id], 
    ...(name && { name }),
    ...(email && { email }),
    ...(phone && { phone }),
    ...(address && { address }),
    ...(parentPhone && { parentPhone }),
    ...(roomNumber !== undefined && { roomNumber }),
    ...(feesStatus && { feesStatus }),
    ...(feesDue !== undefined && { feesDue })
  };
  
  // Also update user data if name or email changed
  const userIndex = db.users.findIndex(user => user.id === req.params.id);
  if (userIndex !== -1) {
    if (name) db.users[userIndex].name = name;
    if (email) db.users[userIndex].email = email;
    if (phone) db.users[userIndex].phone = phone;
    if (address) db.users[userIndex].address = address;
    if (parentPhone) db.users[userIndex].parentPhone = parentPhone;
  }
  
  saveDb(db);
  res.json({ ok: true });
});

// Delete student
app.delete('/api/student/:id', (req, res) => {
  const db = loadDb();
  if (!db.students[req.params.id]) return res.status(404).json({ error: 'Student not found' });
  
  const student = db.students[req.params.id];
  
  // If student has a room assigned, update room occupancy
  if (student.roomNumber) {
    // Update room occupancy in the rooms data
    // Note: This would need to be implemented if you have a rooms collection
    // For now, we'll just log it
    console.log(`Student ${student.name} was removed from room ${student.roomNumber}`);
  }
  
  delete db.students[req.params.id];
  // Also remove from users
  db.users = db.users.filter(user => user.id !== req.params.id);
  saveDb(db);
  res.json({ ok: true });
});

// Delete notice
app.delete('/api/notice/:id', (req, res) => {
  const db = loadDb();
  const noticeIndex = db.notices.findIndex(notice => notice.id === req.params.id);
  if (noticeIndex === -1) return res.status(404).json({ error: 'Notice not found' });
  
  db.notices.splice(noticeIndex, 1);
  saveDb(db);
  res.json({ ok: true });
});

// Update fee endpoint
app.put('/api/fee/:studentId', (req, res) => {
  const { totalFee, paid, feesStatus, feesDue } = req.body;
  const db = loadDb();
  
  // Handle both object and array formats for students
  if (db.students[req.params.studentId]) {
    // Object format
    const student = db.students[req.params.studentId];
    const finalTotalFee = totalFee !== undefined ? totalFee : student.totalFee;
    const finalPaid = paid !== undefined ? paid : student.paid;
    const finalFeesDue = finalTotalFee - finalPaid;
    const finalFeesStatus = finalFeesDue === 0 ? 'Paid' : 'Pending';
    
    db.students[req.params.studentId] = { 
      ...student, 
      totalFee: finalTotalFee,
      paid: finalPaid,
      feesDue: finalFeesDue,
      feesStatus: finalFeesStatus
    };
  } else {
    return res.status(404).json({ error: 'Student not found' });
  }
  
  saveDb(db);
  res.json({ ok: true });
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

// Get attendance for a specific student
app.get('/api/attendance/:studentId', (req, res) => {
  const db = loadDb();
  const student = db.students[req.params.studentId];
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const attendance = student.attendance || [];
  res.json(attendance);
});

// Get attendance list for all students for a date
app.get('/api/attendance', (req, res) => {
  const date = normalizeDate(req.query.date || Date.now());
  if (!date) return res.status(400).json({ error: 'Invalid date' });
  const db = loadDb();
  const result = Object.entries(db.students).map(([id, s]) => {
    const records = (s.attendance || []);
    const rec = records.find(r => r.date === date);
    return {
      id,
      name: s.name,
      email: s.email,
      usn: s.usn,
      status: rec ? rec.status : null
    };
  });
  res.json({ date, attendance: result });
});

// Set or update attendance for a student for a date
app.put('/api/attendance/:studentId', (req, res) => {
  const { date, status } = req.body;
  const normalized = normalizeDate(date);
  if (!normalized) return res.status(400).json({ error: 'Invalid date' });
  if (!['present', 'absent'].includes(String(status))) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const db = loadDb();
  const student = db.students[req.params.studentId];
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (!student.attendance) student.attendance = [];
  const idx = student.attendance.findIndex(r => r.date === normalized);
  if (idx === -1) {
    student.attendance.push({ date: normalized, status });
  } else {
    student.attendance[idx].status = status;
  }
  saveDb(db);
  res.json({ ok: true });
});

// Get rooms with dynamic occupancy calculation
app.get('/api/rooms', (req, res) => {
  const db = loadDb();
  
  // Get all students and count room occupancy
  const students = Object.values(db.students);
  const roomOccupancy = {};
  
  students.forEach(student => {
    if (student.roomNumber) {
      if (!roomOccupancy[student.roomNumber]) {
        roomOccupancy[student.roomNumber] = 0;
      }
      roomOccupancy[student.roomNumber]++;
    }
  });
  
  // Get room configuration from database or use default
  const roomConfig = db.rooms || [
    // Floor 1 - 2-sharing rooms
    { number: '101', capacity: 2, sharingType: '2-sharing', floor: 1 },
    { number: '102', capacity: 2, sharingType: '2-sharing', floor: 1 },
    { number: '103', capacity: 2, sharingType: '2-sharing', floor: 1 },
    { number: '104', capacity: 2, sharingType: '2-sharing', floor: 1 },
    { number: '105', capacity: 2, sharingType: '2-sharing', floor: 1 },
    
    // Floor 1 - 4-sharing rooms
    { number: '106', capacity: 4, sharingType: '4-sharing', floor: 1 },
    { number: '107', capacity: 4, sharingType: '4-sharing', floor: 1 },
    { number: '108', capacity: 4, sharingType: '4-sharing', floor: 1 },
    
    // Floor 2 - 2-sharing rooms
    { number: '201', capacity: 2, sharingType: '2-sharing', floor: 2 },
    { number: '202', capacity: 2, sharingType: '2-sharing', floor: 2 },
    { number: '203', capacity: 2, sharingType: '2-sharing', floor: 2 },
    { number: '204', capacity: 2, sharingType: '2-sharing', floor: 2 },
    { number: '205', capacity: 2, sharingType: '2-sharing', floor: 2 },
    
    // Floor 2 - 4-sharing rooms
    { number: '206', capacity: 4, sharingType: '4-sharing', floor: 2 },
    { number: '207', capacity: 4, sharingType: '4-sharing', floor: 2 },
    { number: '208', capacity: 4, sharingType: '4-sharing', floor: 2 },
    
    // Floor 3 - 2-sharing rooms
    { number: '301', capacity: 2, sharingType: '2-sharing', floor: 3 },
    { number: '302', capacity: 2, sharingType: '2-sharing', floor: 3 },
    { number: '303', capacity: 2, sharingType: '2-sharing', floor: 3 },
    { number: '304', capacity: 2, sharingType: '2-sharing', floor: 3 },
    
    // Floor 3 - 4-sharing rooms
    { number: '305', capacity: 4, sharingType: '4-sharing', floor: 3 },
    { number: '306', capacity: 4, sharingType: '4-sharing', floor: 3 },
    { number: '307', capacity: 4, sharingType: '4-sharing', floor: 3 }
  ];
  
  // Calculate dynamic occupancy for each room
  const rooms = roomConfig.map(room => {
    const occupied = roomOccupancy[room.number] || 0;
    const status = occupied >= room.capacity ? 'full' : 'available';
    
    return {
      ...room,
      occupied,
      status
    };
  });
  
  res.json(rooms);
});

// Update room configuration (for warden)
app.put('/api/room/:roomNumber', (req, res) => {
  const { sharingType, capacity, floor } = req.body;
  const roomNumber = req.params.roomNumber;
  const db = loadDb();
  
  if (!db.rooms) {
    db.rooms = [];
  }
  
  // Find existing room or create new one
  let roomIndex = db.rooms.findIndex(room => room.number === roomNumber);
  
  if (roomIndex === -1) {
    // Create new room
    db.rooms.push({
      number: roomNumber,
      sharingType: sharingType || '2-sharing',
      capacity: capacity || 2,
      floor: floor || 1
    });
  } else {
    // Update existing room
    db.rooms[roomIndex] = {
      ...db.rooms[roomIndex],
      sharingType: sharingType || db.rooms[roomIndex].sharingType,
      capacity: capacity || db.rooms[roomIndex].capacity,
      floor: floor || db.rooms[roomIndex].floor
    };
  }
  
  saveDb(db);
  res.json({ ok: true });
});

// Add new room (for warden)
app.post('/api/room', (req, res) => {
  const { number, sharingType, capacity, floor } = req.body;
  const db = loadDb();
  
  if (!db.rooms) {
    db.rooms = [];
  }
  
  // Check if room already exists
  const existingRoom = db.rooms.find(room => room.number === number);
  if (existingRoom) {
    return res.status(409).json({ error: 'Room already exists' });
  }
  
  // Add new room
  db.rooms.push({
    number,
    sharingType: sharingType || '2-sharing',
    capacity: capacity || 2,
    floor: floor || 1
  });
  
  saveDb(db);
  res.json({ ok: true });
});

// Delete room (for warden)
app.delete('/api/room/:roomNumber', (req, res) => {
  const roomNumber = req.params.roomNumber;
  const db = loadDb();
  
  if (!db.rooms) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const roomIndex = db.rooms.findIndex(room => room.number === roomNumber);
  if (roomIndex === -1) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  // Check if any students are assigned to this room
  const studentsInRoom = Object.values(db.students).filter(student => student.roomNumber === roomNumber);
  if (studentsInRoom.length > 0) {
    return res.status(400).json({ error: 'Cannot delete room with assigned students' });
  }
  
  db.rooms.splice(roomIndex, 1);
  saveDb(db);
  res.json({ ok: true });
});

// Serve static files
app.use(express.static(__dirname));

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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


