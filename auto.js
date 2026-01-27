require('dotenv').config();
const mongoose = require('mongoose');

const Tr = require('./model/tr');
const BankTr = require('./model/banktr');

async function autoSeed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Clear old dummy data
    await Promise.all([
      Tr.deleteMany({ dump: true }),
      BankTr.deleteMany({ dump: true })
    ]);

    console.log('🧹 Old dump data removed');

    // ===== BOOK TRANSACTIONS (TR) =====
    await Tr.create([
      {
        date: new Date('2025-11-06'),
        accountType: 'GOF',
        desc: 'Payment of uniform allowance',
        checkNo: '1723917',
        voucherNo: '25-11-1496',
        amount: 350000,
        type: 'Debit',
        dump: true
      },
      {
        date: new Date('2025-11-07'),
        accountType: 'GOF',
        desc: 'Payment of internet services',
        checkNo: '1723918',
        voucherNo: '25-11-1497',
        amount: 1875.01,
        type: 'Debit',
        dump: true
      }
    ]);

    // ===== BANK TRANSACTIONS =====
    await BankTr.create([
      {
        date: new Date('2025-11-12'),
        accountType: 'GOF',
        desc: 'ENCASHMENT',
        checkNo: '1723917', // matched
        amount: 350000,
        type: 'Debit',
        dump: true
      },
      {
        date: new Date('2025-11-20'),
        accountType: 'GOF',
        desc: 'BANK SERVICE CHARGE',
        checkNo: null, // bank-only transaction
        amount: 500,
        type: 'Debit',
        dump: true
      }
    ]);

    console.log('🎉 Dummy Bank & Book transactions seeded');
    process.exit();
  } catch (err) {
    console.error('❌ Seeder error:', err);
    process.exit(1);
  }
}

autoSeed();
