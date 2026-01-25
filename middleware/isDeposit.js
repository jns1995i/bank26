const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const Deposit = require('../model/deposit');

module.exports = async (req, res, next) => {
  try {
    const allDeposits = await Deposit.find().sort({ dateDeposited: -1 }).lean();

    const formattedDeposits = allDeposits.map(d => ({
      ...d,
      dateDepositedFormatted: d.dateDeposited ? dayjs(d.dateDeposited).format('MMM D, YYYY h:mm A') : '—',
      dateDepositedAgo: d.dateDeposited ? dayjs(d.dateDeposited).fromNow() : '—'
    }));

    req.deposits = formattedDeposits;
    res.locals.deposits = formattedDeposits;

    console.log(`💵 Deposits loaded: ${formattedDeposits.length} entries`);
    next();
  } catch (err) {
    console.error('⚠️ Error in isDeposit middleware:', err);
    req.deposits = [];
    res.locals.deposits = [];
    next();
  }
};
