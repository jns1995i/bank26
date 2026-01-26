require('dotenv').config();
const mongoose = require('mongoose');

// Import your models
const Tr = require('./model/tr');
const BankTr = require('./model/banktr');
const Deposit = require('./model/deposit');
const Out = require('./model/out');
const Except = require('./model/except');
const Reco = require('./model/reco');

async function deleteDumpData() {
  try {
    // 1. Connect to your Database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for cleanup...');

    // 2. Delete only the records where dump is true
    const results = await Promise.all([
      Tr.deleteMany({ dump: true }),
      BankTr.deleteMany({ dump: true }),
      Deposit.deleteMany({ dump: true }),
      Out.deleteMany({ dump: true }),
      Except.deleteMany({ dump: true }),
      Reco.deleteMany({ dump: true })
    ]);

    // 3. Calculate total deleted records
    const totalDeleted = results.reduce((acc, curr) => acc + curr.deletedCount, 0);

    console.log(`🧹 Cleanup Complete!`);
    console.log(`🗑️ Total dump records removed: ${totalDeleted}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup error:', err);
    process.exit(1);
  }
}

deleteDumpData();