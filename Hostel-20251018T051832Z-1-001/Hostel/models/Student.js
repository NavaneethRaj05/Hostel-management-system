const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  }
}, { _id: false });

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  usn: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  parentPhone: {
    type: String,
    required: true
  },
  roomNumber: {
    type: String,
    default: 'Not Assigned'
  },
  feesStatus: {
    type: String,
    enum: ['Paid', 'Pending'],
    default: 'Pending'
  },
  feesDue: {
    type: Number,
    default: 0
  },
  totalFee: {
    type: Number,
    default: 0
  },
  paid: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  attendance: [attendanceSchema]
}, {
  timestamps: true
});

// Create indexes
studentSchema.index({ email: 1 });
studentSchema.index({ usn: 1 });
studentSchema.index({ roomNumber: 1 });

module.exports = mongoose.model('Student', studentSchema);
