const mongoose = require('mongoose');

const exceptSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'tr',
    default: null
  },

  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'banktr',
    default: null
  },

  amount: {
    type: Number,
    required: true
  },

  type: {
    type: String,
    enum: ['Company Only', 'Bank Only', 'Mismatch'],
    required: true
  },

  reason: {
    type: String,
    trim: true,
    required: true
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

module.exports = mongoose.model('except', exceptSchema);
