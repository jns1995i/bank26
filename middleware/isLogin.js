
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const User = require('../model/user');

module.exports = async (req, res, next) => {
  try {
    // Check session
    if (!req.session || !req.session.user) {
      console.log('⚠️ Unauthorized access attempt — Please login first!');
      req.session.error = 'Please login first!';
      return res.redirect('/');
    }

    // Fetch user from DB
    const user = await User.findById(req.session.user._id);

    if (!user) {
      req.session.destroy();
      return res.redirect('/');
    }

    // Attach user to request and views
    req.user = user;
    res.locals.user = user;

    console.log(`✅ Logged in as ${user.fName} ${user.lName}`);

    next();
  } catch (err) {
    console.error('⚠️ Error in isLogin middleware:', err);
    res.status(500).render('index', {
      title: 'Login Error',
      error: 'Internal Server Error: Unable to load user data.'
    });
  }
};
