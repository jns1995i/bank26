const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const Tr = require('../model/tr');

module.exports = async (req, res, next) => {
  try {
    const allTr = await Tr.find().sort({ date: -1 }).lean();

    const formattedTr = allTr.map(tr => ({
      ...tr,
      dateFormatted: tr.date ? dayjs(tr.date).format('MMM D, YYYY h:mm A') : '—',
      dateAgo: tr.date ? dayjs(tr.date).fromNow() : '—'
    }));

    req.trs = formattedTr;
    res.locals.trs = formattedTr;

    console.log(`💰 Tr loaded: ${formattedTr.length} entries`);
    next();
  } catch (err) {
    console.error('⚠️ Error in isTr middleware:', err);
    req.trs = [];
    res.locals.trs = [];
    next();
  }
};
