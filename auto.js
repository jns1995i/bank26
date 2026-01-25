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
    await mongoose.connect(process.env.MONGO_URI); // ⬅️ removed options
    console.log('✅ MongoDB connected');

    await Promise.all([
      Tr.deleteMany({ dump: true }),
      BankTr.deleteMany({ dump: true }),
      Deposit.deleteMany({ dump: true }),
      Out.deleteMany({ dump: true }),
      Except.deleteMany({ dump: true }),
      Reco.deleteMany({ dump: true })
    ]);

    console.log('🧹 Old dump data removed');

    const companyTr = await Tr.create([
      { date: new Date(), desc: 'Office Supplies', amount: 5000, type: 'Debit', dump: true },
      { date: new Date(), desc: 'Client Payment', amount: 15000, type: 'Credit', dump: true }
    ]);

    const bankTr = await BankTr.create([
      { date: new Date(), desc: 'Client Payment', amount: 15000, type: 'Credit', dump: true },
      { date: new Date(), desc: 'Bank Service Fee', amount: 500, type: 'Debit', dump: true }
    ]);

    await Out.create([
      { checkNo: 'CHK-001', issuedAt: new Date(), payee: 'Supplier A', amount: 5000, status: 'Pending', dump: true }
    ]);

    await Deposit.create([
      { dateDeposited: new Date(), source: 'Cash', amount: 8000, status: 'pending', dump: true }
    ]);

    await Except.create([
      { companyId: companyTr[0]._id, bankId: null, amount: 5000, type: 'Company Only', reason: 'Outstanding check', dump: true },
      { companyId: null, bankId: bankTr[1]._id, amount: 500, type: 'Bank Only', reason: 'Unrecorded bank charge', dump: true }
    ]);

    await Reco.create({
      dateGenerated: new Date(),
      bankBalance: 24500,
      companyBalance: 28000,
      totalOutstanding: 5000,
      totalDeposit: 8000,
      adjustedBalance: 27500,
      difference: 500,
      dump: true
    });

    console.log('🎉 Dummy data seeded successfully');
    process.exit();

  } catch (err) {
    console.error('❌ Seeder error:', err);
    process.exit(1);
  }
}

autoSeed();
