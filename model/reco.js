const mongoose = require('mongoose');

const recoSchema = new mongoose.Schema({
  dateGenerated: {
    type: Date,
    required: true
  },

  bankBalance: {
    type: Number,
    required: true
  },

  companyBalance: {
    type: Number,
    required: true
  },

  totalOutstanding: {
    type: Number,
    required: true
  },

  totalDeposit: {
    type: Number,
    required: true
  },

  adjustedBalance: {
    type: Number,
    required: true
  },

  difference: {
    type: Number,
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

module.exports = mongoose.model('reco', recoSchema);
