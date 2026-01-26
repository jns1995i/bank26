const mongoose = require('mongoose');

const trSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  // 1. ADD: The Fund/Account type (GOF, CPF, RCA, MSC)
  accountType: {
    type: String,
    enum: ['GOF', 'CPF', 'RCA', 'MSC'],
    required: true
  },

  // 2. ADD: The Check Number for matching
  checkNo: {
    type: String,
    trim: true,
    default: "" // Some entries like "Interest" might not have a check number
  },

  // 3. ADD: The Voucher Number for internal tracking
  voucherNo: {
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

module.exports = mongoose.model('tr', trSchema);

