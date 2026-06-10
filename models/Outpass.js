const mongoose = require('mongoose');

const outpassSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  fromDate: {
    type: String,
    required: true
  },
  toDate: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

outpassSchema.index({ studentId: 1 });
outpassSchema.index({ status: 1 });

module.exports = mongoose.model('Outpass', outpassSchema);
