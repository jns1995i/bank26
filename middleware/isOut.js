const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const Out = require('../model/out');

module.exports = async (req, res, next) => {
  try {
    const allOut = await Out.find().sort({ issuedAt: -1 }).lean();

    const formattedOut = allOut.map(o => ({
      ...o,
      issuedAtFormatted: o.issuedAt ? dayjs(o.issuedAt).format('MMM D, YYYY h:mm A') : '—',
      issuedAtAgo: o.issuedAt ? dayjs(o.issuedAt).fromNow() : '—'
    }));

    req.outs = formattedOut;
    res.locals.outs = formattedOut;

    console.log(`📄 Out loaded: ${formattedOut.length} entries`);
    next();
  } catch (err) {
    console.error('⚠️ Error in isOut middleware:', err);
    req.outs = [];
    res.locals.outs = [];
    next();
  }
};
