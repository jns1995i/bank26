const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const Reco = require('../model/reco');

module.exports = async (req, res, next) => {
  try {
    // 1. Fetching all reports, newest first
    const allReco = await Reco.find().sort({ dateGenerated: -1 }).lean();

    const formattedReco = allReco.map(r => {
      // 2. Formatting the date for the NFA report style
      const dateGeneratedFormatted = r.dateGenerated 
        ? dayjs(r.dateGenerated).format('MMMM D, YYYY') // e.g. "November 30, 2025"
        : '—';
      
      const dateGeneratedAgo = r.dateGenerated 
        ? dayjs(r.dateGenerated).fromNow() 
        : '—';

      // 3. Ensuring numbers exist to prevent .toLocaleString() crashes in EJS
      // This maps the new fields we added to your model
      return {
        ...r,
        dateGeneratedFormatted,
        dateGeneratedAgo,
        // Defaulting to 0 if null to prevent frontend errors
        unadjustedBankBalance: r.unadjustedBankBalance || 0,
        adjustedBankBalance: r.adjustedBankBalance || 0,
        unadjustedBookBalance: r.unadjustedBookBalance || 0,
        adjustedBookBalance: r.adjustedBookBalance || 0,
        outstandingChecks: r.outstandingChecks || 0,
        difference: r.difference || 0,
        // Identifying the fund (GOF, RCA, etc.)
        fundLabel: r.accountType ? r.accountType.toUpperCase() : 'UNKNOWN'
      };
    });

    // 4. Passing to locals so rec.ejs can access them
    req.recos = formattedReco;
    res.locals.recos = formattedReco;

    console.log(`📊 [RECO] ${formattedReco.length} reports loaded for ${formattedReco.map(f => f.accountType).join(', ')}`);
    next();
  } catch (err) {
    console.error('⚠️ Error in isReco middleware:', err);
    req.recos = [];
    res.locals.recos = [];
    next();
  }
};