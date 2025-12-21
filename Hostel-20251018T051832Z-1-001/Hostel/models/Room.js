const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    unique: true
  },
  sharingType: {
    type: String,
    enum: ['2-sharing', '3-sharing', '4-sharing', '5-sharing'],
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  floor: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

roomSchema.index({ number: 1 });

module.exports = mongoose.model('Room', roomSchema);
