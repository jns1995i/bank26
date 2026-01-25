const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const Reco = require('../model/reco');

module.exports = async (req, res, next) => {
  try {
    const allReco = await Reco.find().sort({ dateGenerated: -1 }).lean();

    const formattedReco = allReco.map(r => ({
      ...r,
      dateGeneratedFormatted: r.dateGenerated ? dayjs(r.dateGenerated).format('MMM D, YYYY h:mm A') : '—',
      dateGeneratedAgo: r.dateGenerated ? dayjs(r.dateGenerated).fromNow() : '—'
    }));

    req.recos = formattedReco;
    res.locals.recos = formattedReco;

    console.log(`📊 Reco loaded: ${formattedReco.length} entries`);
    next();
  } catch (err) {
    console.error('⚠️ Error in isReco middleware:', err);
    req.recos = [];
    res.locals.recos = [];
    next();
  }
};
