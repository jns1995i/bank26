require('dotenv').config();
const mongoose = require('mongoose');

const Tr = require('./model/tr');
const BankTr = require('./model/banktr');
const Deposit = require('./model/deposit');
const Out = require('./model/out');
const Except = require('./model/except');
const Reco = require('./model/reco');

async function autoSeed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Clean old dump data
    await Promise.all([
      Tr.deleteMany({ dump: true }),
      BankTr.deleteMany({ dump: true }),
      Deposit.deleteMany({ dump: true }),
      Out.deleteMany({ dump: true }),
      Except.deleteMany({ dump: true }),
      Reco.deleteMany({ dump: true })
    ]);

    console.log('🧹 Old dump data removed');

    // 1. Create Book Transactions (Internal Ledger)
    // Adding checkNo and voucherNo based on your Excel files
    const companyTr = await Tr.create([
      { 
        date: new Date('2025-11-06'), 
        accountType: 'GOF', // Fund identification
        desc: 'Payment of uniform allowance', 
        checkNo: '1723917', // Match this to bank
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

    // 2. Create Bank Transactions (LBP Statement)
    // Matching one record and leaving one unmatched for testing
    const bankTr = await BankTr.create([
      { 
        date: new Date('2025-11-12'), 
        accountType: 'GOF',
        desc: 'ENCASHMENT', 
        checkNo: '1723917', // Matches Book Record 1
        amount: 350000, 
        type: 'Debit', 
        dump: true,
        status: 'Reconciled' // This one is cleared
      },
      { 
        date: new Date('2025-11-20'), 
        accountType: 'GOF',
        desc: 'BANK SERVICE CHARGE', 
        checkNo: '', // No check number for bank charges
        amount: 500, 
        type: 'Debit', 
        dump: true 
      }
    ]);

    // 3. Outstanding Checks (Entries in Book but not in Bank)
    await Out.create([
      { 
        checkNo: '1723918', 
        accountType: 'GOF',
        issuedAt: new Date('2025-11-07'), 
        payee: 'PLDT INC.', 
        amount: 1875.01, 
        status: 'Pending', 
        dump: true 
      }
    ]);

    // 4. Deposits in Transit (Collected but not yet in Bank)
    await Deposit.create([
      { 
        dateDeposited: new Date(), 
        accountType: 'RCA',
        source: 'Rice Sales', 
        amount: 108750, 
        status: 'pending', 
        dump: true 
      }
    ]);

    // 5. Exceptions (Handling Discrepancies)
    await Except.create([
      { 
        companyId: null, 
        bankId: bankTr[1]._id, // Linking to the Bank Charge
        amount: 500, 
        type: 'Bank Only', 
        reason: 'Unrecorded bank charge needs to be added to Books', 
        dump: true 
      }
    ]);

    // 6. Final Reconciliation Summary
    await Reco.create({
      dateGenerated: new Date(),
      accountType: 'GOF',
      bankBalance: 3291003.36, // Sample balance from your Excel
      companyBalance: 135369.62,
      totalOutstanding: 1875.01,
      totalDeposit: 0,
      adjustedBalance: 135369.62,
      difference: 0,
      dump: true
    });

    console.log('🎉 NFA-Structured Dummy data seeded successfully');
    process.exit();

  } catch (err) {
    console.error('❌ Seeder error:', err);
    process.exit(1);
  }
}

autoSeed();