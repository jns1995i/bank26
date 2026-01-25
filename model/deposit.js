const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  dateDeposited: {
    type: Date,
    required: true
  },

  source: {
    type: String,
    trim: true,
    required: true // cash or check
  },

  amount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'cleared'],
    default: 'pending'
  },

  archive: {
    type: Boolean,
    default: false
  },

  isArchive: {
    type: String,
    trim: true
  },

  dump: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('deposit', depositSchema);
