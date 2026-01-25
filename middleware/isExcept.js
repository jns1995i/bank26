const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const Except = require('../model/except');

module.exports = async (req, res, next) => {
  try {
    const allExcept = await Except.find().sort({ createdAt: -1 }).lean();

    const formattedExcept = allExcept.map(e => ({
      ...e,
      createdAtFormatted: e.createdAt ? dayjs(e.createdAt).format('MMM D, YYYY h:mm A') : '—',
      createdAtAgo: e.createdAt ? dayjs(e.createdAt).fromNow() : '—'
    }));

    req.excepts = formattedExcept;
    res.locals.excepts = formattedExcept;

    console.log(`⚠️ Except loaded: ${formattedExcept.length} entries`);
    next();
  } catch (err) {
    console.error('⚠️ Error in isExcept middleware:', err);
    req.excepts = [];
    res.locals.excepts = [];
    next();
  }
};
