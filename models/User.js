const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['student', 'warden'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  usn: {
    type: String,
    sparse: true,
    uppercase: true
  },
  phone: {
    type: String
  },
  address: {
    type: String
  },
  parentPhone: {
    type: String
  }
}, {
  timestamps: true
});

// Create index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ usn: 1 });

module.exports = mongoose.model('User', userSchema);
