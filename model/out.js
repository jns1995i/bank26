const mongoose = require('mongoose');

const outSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },

  // Matches the account types from your banktr
  accountType: {
    type: String,
    enum: ['GOF', 'CPF', 'RCA', 'MSC'],
    required: true
  },

  checkNo: {
    type: String,
    trim: true,
    required: true // Usually required for outstanding checks
  },

  payee: {
    type: String,
    trim: true,
    required: true
  },

  particulars: {
    type: String,
    trim: true
  },

  amount: {
    type: Number,
    required: true
  },

  // Status for reconciliation: 
  // 'Outstanding' = not yet in bank statement
  // 'Cleared' = matched with a bank statement entry
  status: {
    type: String,
    enum: ['Outstanding', 'Cleared'],
    default: 'Outstanding'
  },

  // Metadata fields to match your banktr schema
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

// Indexing checkNo for faster reconciliation lookups
outSchema.index({ checkNo: 1, accountType: 1 });

module.exports = mongoose.model('out', outSchema);