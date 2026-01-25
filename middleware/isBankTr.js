const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const BankTr = require('../model/banktr');

module.exports = async (req, res, next) => {
  try {
    const allBankTr = await BankTr.find().sort({ date: -1 }).lean();

    const formattedBankTr = allBankTr.map(bt => ({
      ...bt,
      dateFormatted: bt.date ? dayjs(bt.date).format('MMM D, YYYY h:mm A') : '—',
      dateAgo: bt.date ? dayjs(bt.date).fromNow() : '—'
    }));

    req.bankTrs = formattedBankTr;
    res.locals.bankTrs = formattedBankTr;

    console.log(`🏦 BankTr loaded: ${formattedBankTr.length} entries`);
    next();
  } catch (err) {
    console.error('⚠️ Error in isBankTr middleware:', err);
    req.bankTrs = [];
    res.locals.bankTrs = [];
    next();
  }
};
