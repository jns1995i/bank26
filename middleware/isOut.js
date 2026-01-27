const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const Out = require('../model/out');

module.exports = async (req, res, next) => {
  try {
    // 1. Fetch from 'Out' collection, sorted by the 'date' field
    const allOut = await Out.find({ archive: false }).sort({ date: -1 }).lean();

    const formattedOut = allOut.map(o => ({
      ...o,
      // Using 'date' as per the schema we defined
      dateFormatted: o.date ? dayjs(o.date).format('MMM D, YYYY') : '—',
      dateAgo: o.date ? dayjs(o.date).fromNow() : '—',
      
      // Since 'amount' is a single field in DB, but comes from CPF/GOF in Excel
      // We can add a helper for the UI to show which fund it came from
      fundSource: o.accountType, 
      displayAmount: new Intl.NumberFormat('en-PH', { 
        style: 'currency', 
        currency: 'PHP' 
      }).format(o.amount)
    }));

    req.outs = formattedOut;
    res.locals.outs = formattedOut;

    console.log(`📄 Outstanding Checks loaded: ${formattedOut.length} entries`);
    next();
  } catch (err) {
    console.error('⚠️ Error in isOut middleware:', err);
    req.outs = [];
    res.locals.outs = [];
    next();
  }
};