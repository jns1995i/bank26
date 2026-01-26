const mongoose = require('mongoose');

const banktrSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  // 1. ADD: Which account this bank statement belongs to
  accountType: {
    type: String,
    enum: ['GOF', 'CPF', 'RCA', 'MSC'],
    required: true
  },

  // 2. ADD: The Check Number (LBP usually provides this in the statement)
  checkNo: {
    type: String,
    trim: true
  },

  desc: {
    type: String,
    trim: true,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  type: {
    type: String,
    enum: ['Debit', 'Credit'],
    required: true
  },

  status: {
    type: String,
    enum: ['Recorded', 'Reconciled'],
    default: 'Recorded'
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

module.exports = mongoose.model('banktr', banktrSchema);
