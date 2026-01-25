const mongoose = require('mongoose');

const outSchema = new mongoose.Schema({
  checkNo: {
    type: String,
    trim: true,
    required: true
  },

  issuedAt: {
    type: Date,
    required: true
  },

  payee: {
    type: String,
    trim: true,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ['Pending', 'Cleared'],
    default: 'Pending'
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

module.exports = mongoose.model('out', outSchema);
