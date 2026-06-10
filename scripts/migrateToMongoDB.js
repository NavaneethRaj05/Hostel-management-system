const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Student = require('../models/Student');
const Notice = require('../models/Notice');
const Room = require('../models/Room');
const Outpass = require('../models/Outpass');

const DB_PATH = path.join(__dirname, '..', 'db.json');

async function migrateData() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_management';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Read JSON file
    if (!fs.existsSync(DB_PATH)) {
      console.log('No db.json file found. Nothing to migrate.');
      process.exit(0);
    }

    const jsonData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    console.log('Loaded data from db.json');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Notice.deleteMany({});
    await Room.deleteMany({});
    await Outpass.deleteMany({});

    // Migrate Users
    console.log('Migrating users...');
    const userMap = {};
    for (const user of jsonData.users || []) {
      const newUser = await User.create({
        role: user.role,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        usn: user.usn,
        phone: user.phone,
        address: user.address,
        parentPhone: user.parentPhone
      });
      userMap[user.id] = newUser._id;
      console.log(`  - Created user: ${user.name} (${user.email})`);
    }

    // Migrate Students
    console.log('Migrating students...');
    const students = jsonData.students || {};
    for (const [id, student] of Object.entries(students)) {
      const userId = userMap[id];
      if (!userId) {
        console.log(`  - Warning: No user found for student ${id}, skipping...`);
        continue;
      }

      await Student.create({
        userId: userId,
        name: student.name,
        email: student.email,
        usn: student.usn,
        phone: student.phone,
        address: student.address,
        parentPhone: student.parentPhone,
        roomNumber: student.roomNumber || 'Not Assigned',
        feesStatus: student.feesStatus || 'Pending',
        feesDue: student.feesDue || 0,
        totalFee: student.totalFee || 0,
        paid: student.paid || 0,
        status: student.status || 'active',
        attendance: student.attendance || []
      });
      console.log(`  - Created student: ${student.name} (${student.usn})`);
    }

    // Migrate Notices
    console.log('Migrating notices...');
    for (const notice of jsonData.notices || []) {
      await Notice.create({
        title: notice.title,
        body: notice.body,
        createdAt: notice.createdAt ? new Date(notice.createdAt) : new Date()
      });
      console.log(`  - Created notice: ${notice.title}`);
    }

    // Migrate Rooms
    console.log('Migrating rooms...');
    for (const room of jsonData.rooms || []) {
      await Room.create({
        number: room.number,
        sharingType: room.sharingType,
        capacity: room.capacity,
        floor: room.floor
      });
      console.log(`  - Created room: ${room.number}`);
    }

    // Migrate Outpasses
    console.log('Migrating outpasses...');
    for (const outpass of jsonData.outpasses || []) {
      await Outpass.create({
        studentId: outpass.studentId,
        studentName: outpass.studentName,
        reason: outpass.reason,
        fromDate: outpass.fromDate,
        toDate: outpass.toDate,
        status: outpass.status || 'pending',
        createdAt: outpass.createdAt ? new Date(outpass.createdAt) : new Date()
      });
      console.log(`  - Created outpass for: ${outpass.studentName}`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`  Users: ${await User.countDocuments()}`);
    console.log(`  Students: ${await Student.countDocuments()}`);
    console.log(`  Notices: ${await Notice.countDocuments()}`);
    console.log(`  Rooms: ${await Room.countDocuments()}`);
    console.log(`  Outpasses: ${await Outpass.countDocuments()}`);

    // Create backup of JSON file
    const backupPath = path.join(__dirname, '..', `db.json.backup.${Date.now()}`);
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`\n📦 Backup created: ${backupPath}`);

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateData();
