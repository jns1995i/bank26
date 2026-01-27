const mongoose = require('mongoose');

const recoSchema = new mongoose.Schema({
  dateGenerated: {
    type: Date,
    required: true
  },
  // Added to distinguish between GOF, CPF, RCA, and MSC as seen in Excel 
  accountType: {
    type: String,
    enum: ['GOF', 'CPF', 'RCA', 'MSC'],
    required: true
  },
  // Added to track the specific bank account number 
  accountNumber: {
    type: String,
    trim: true
  },

  // --- BANK SECTION (Matches "Unadjusted Bank Balance" in Excel)  ---
  unadjustedBankBalance: {
    type: Number,
    required: true
  },
  bankError: {
    type: Number,
    default: 0
  },
  bankMemos: { // For Debit/Credit Memos mentioned in reports 
    type: Number,
    default: 0
  },
  outstandingChecks: { // Matches the -1,964,115.78 logic in your GOF report 
    type: Number,
    default: 0
  },
  overDeposit: {
    type: Number,
    default: 0
  },
  depositInTransit: {
    type: Number,
    default: 0
  },
  adjustedBankBalance: {
    type: Number,
    required: true
  },

  // --- BOOK SECTION (Matches "Unadjusted Book Balance" in Excel)  ---
  unadjustedBookBalance: {
    type: Number,
    required: true
  },
  bookReconcilingItems: { // For any adjustments needed on the company side 
    type: Number,
    default: 0
  },
  adjustedBookBalance: {
    type: Number,
    required: true
  },

  // Final check to ensure Adjusted Bank === Adjusted Book
  difference: {
    type: Number,
    default: 0
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