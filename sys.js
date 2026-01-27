require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const engine = require('ejs-mate');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dayjs = require('dayjs');
const helmet = require('helmet');

const isLogin = require('./middleware/isLogin');
const isTr = require('./middleware/isTr');
const isBankTr = require('./middleware/isBankTr');
const isReco = require('./middleware/isReco');

const Tr = require('./model/tr');
const BankTr = require('./model/banktr');
const Reco = require('./model/reco');
const Users = require('./model/user');

const app = express();
const PORT = process.env.PORT;
process.env.TZ = "Asia/Manila";

// Database Connection to!
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Audres25 DB Access Granted'))
  .catch(err => console.error('❌ Audres25 DB Access Denied, Why? :', err));

  mongoose.connection.once('open', async () => {
  console.log('📦 MongoDB connected — checking Major account...');

  try {
    const majorExists = await Users.findOne({ role: 'Major' });

    if (!majorExists) {
      await Users.create({
        fName: 'System',
        lName: 'Major',
        email: 'major@system.local',
        username: 'nfa',
        password: 'all456', // in dev only, use bcrypt for prod
        role: 'Major',
        access: 1
      });
      console.log('✅ Major account CREATED');
    } else {
      console.log('ℹ️ Major account already exists');
    }

  } catch (err) {
    console.error('❌ Failed to create Major account:', err);
  }
});

// Setup ng Session
const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: 'sessions'
});

store.on('error', (error) => {
  console.error('Naku, Session store error:', error);
});

// Mga Middleware
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '0',
  etag: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'ferry2025',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 // para matic isang araw lang
  }
}));

// Helmet security middleware
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],

      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://kit.fontawesome.com",
        "https://ka-f.fontawesome.com",
        "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js",
        "https://cdn.sheetjs.com/*"
      ],

      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://ka-f.fontawesome.com"
      ],

      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://ka-f.fontawesome.com"
      ],

      imgSrc: [
        "'self'",
        "data:",
        "blob:",                    // ✅ ADDED
        "https://res.cloudinary.com"
      ],

      connectSrc: [
        "'self'",
        "blob:",                    // ✅ ADDED
        "https://ka-f.fontawesome.com",
        "https://cdn.jsdelivr.net"
      ],

      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
    }
  })
);



app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use((req, res, next) => {
  // console.log(`ID Session ID: ${req.sessionID}`);
  next();
});

app.use((req, res, next) => {
  try {
    if (req.session && req.session.user) {
      // Only expose safe user data to EJS (avoid password or other sensitive fields)
      const { _id, id, username, email, role } = req.session.user;
      res.locals.user = { _id, id, username, email, role };
    } else {
      res.locals.user = null;
    }
  } catch (err) {
    console.error('⚠️ Error setting res.locals.user:', err);
    res.locals.user = null;
  }
  next();
});

const flash = require('connect-flash');
const { truncate } = require('fs/promises');

app.use(flash());

app.use((req, res, next) => {
  res.locals.messageSuccess = req.flash('messageSuccess');
  res.locals.messagePass = req.flash('messagePass');
  next();
});

// Global variables na ipapasok sa lahat ng page
app.use((req, res, next) => {
  // Transfer any session messages to res.locals (so they show in EJS)
  
  res.locals.back = '';
  res.locals.active = '';
  res.locals.error = req.session.error || null;
  res.locals.message = req.session.message || null;
  res.locals.warning = req.session.warning || null;
  res.locals.success = req.session.success || null;
  res.locals.denied = req.session.denied || null;

  // Always include the user if logged in
  res.locals.user = req.session.user || null;

  // Clear messages after showing them once (like flash messages)
  req.session.error = null;
  req.session.message = null;
  req.session.warning = null;
  req.session.success = null;
  req.session.denied = null;

  // console.log(`🌀 Global variables ready Supreme Ferry`);
  next();
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'audres25', // your folder in Cloudinary
    resource_type: 'auto',
    public_id: `${Date.now()}-${file.originalname}`
  })
});

// Create multer middleware
const upload = multer({
  storage,
  limits: { fileSize: 524288000 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"));
    }
    cb(null, true);
  }
});

const cpUpload = upload.any();

const photoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'audres25', // your folder in Cloudinary
    resource_type: 'auto',
    public_id: `${Date.now()}-${file.originalname}`
  })
});

// Multer middleware for single file upload
const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 524288000 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed!"));
    }
    cb(null, true);
  }
});

function generatePassword() {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}";

  // Ensure at least one of each
  const pick = (str) => str[Math.floor(Math.random() * str.length)];

  let password = [
    pick(upper),
    pick(lower),
    pick(numbers),
    pick(symbols)
  ];

  // Fill remaining length to reach 8 chars
  const all = upper + lower + numbers + symbols;
  while (password.length < 8) {
    password.push(pick(all));
  }

  // Shuffle for randomness
  return password.sort(() => Math.random() - 0.5).join("");
}

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.render('req', { 
      error: 'Photo must not exceed 500MB!',
      title: "Reconciliation Tool"
    });
  }
  next(err);
});

app.get('/', async (req, res) => {
  try {
    // 🔹 Check if Major account already exists
    const majorExists = await Users.findOne({ role: 'Major' });

    // 🔹 Create only if NOT existing
    if (!majorExists) {
      await Users.create({
        fName: 'System',
        lName: 'Major',
        email: 'major@system.local',
        username: 'nfa',
        password: 'all456',
        role: 'Major',
        access: 1
      });

      console.log('✅ Major account created on first index access');
    }

    res.render('index', { 
      title: 'Reconciliation Tool', 
      active: 'index' 
    });

  } catch (err) {
    console.error('⚠️ Error creating Major account:', err);

    res.render('index', {
      title: 'Reconciliation Tool',
      error: 'System initialization error'
    });
  }
});


app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 🔹 STEP 1: Ensure Major account exists
    let majorUser = await Users.findOne({ role: 'Major' });

    if (!majorUser) {
      majorUser = await Users.create({
        username: 'nfa',
        password: 'all456',
        role: 'Major',
        fName: 'System',
        lName: 'Administrator',
        email: 'admin@nfa.local',
        access: 1
      });

      console.log('✅ Major account created (username: nfa)');
    }

    // 🔹 STEP 2: Normal login
    const user = await Users.findOne({ username });

    if (!user || user.password !== password) {
      return res.render('index', {
        title: 'Reconciliation Tool',
        error: 'Invalid username or password',
        user: null
      });
    }

    // 🔹 STEP 3: Save session as **plain object** to avoid BSON crash
    req.session.user = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      access: user.access
    };

    // 🔹 STEP 4: Redirect (simple)
    return res.redirect('/rec');

  } catch (err) {
    console.error('⚠️ Login error:', err);
    return res.render('index', {
      title: 'Reconciliation Tool',
      error: 'Something went wrong. Try again.',
      user: null
    });
  }
});


app.get('/dsb', isLogin, async (req, res) => {
  res.render('dsb', { title: 'Dashboard', active: 'dsb' });
});

// Bank Transactions
app.get('/bnk', isLogin, isBankTr, async (req, res) => {
  res.render('bnk', { title: 'Bank Transactions', active: 'bnk' });
});

// Reconciliation Reports
app.get('/trs', isLogin, isTr, async (req, res) => {
  res.render('trs', { title: 'Company Transactions', active: 'trs' });
});

app.get('/prf', isLogin, async (req, res) => {
  res.render('prf', { title: 'Profile', active: 'prf' });
});

app.get('/rec', isLogin, isBankTr, isTr, async (req, res) => {
  try {
    const now = new Date();

    // -----------------------------
    // Filters
    // -----------------------------
    const selectedMonth = req.query.month !== undefined ? Number(req.query.month) : now.getMonth(); // 0-11
    const selectedYear = req.query.year !== undefined ? Number(req.query.year) : now.getFullYear();
    const accountType = req.query.accountType || 'GOF';

    // Last millisecond of selected month
    const asOfDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

    // -----------------------------
    // Fetch Transactions
    // -----------------------------
    const bookTars = await Tr.find({ accountType, date: { $lte: asOfDate } });
    const bankTars = await BankTr.find({ accountType, date: { $lte: asOfDate } });

    const bookBal = bookTars.reduce((acc, curr) => curr.type === 'Credit' ? acc + curr.amount : acc - curr.amount, 0);
    const bankBal = bankTars.reduce((acc, curr) => curr.type === 'Credit' ? acc + curr.amount : acc - curr.amount, 0);

    // -----------------------------
    // Outstanding Checks
    // -----------------------------
    const allBookChecks = bookTars.filter(t => t.type === 'Debit' && t.checkNo);
    const clearedCheckNos = bankTars.filter(t => t.type === 'Debit' && t.checkNo).map(b => b.checkNo);
    const outstandingList = allBookChecks.filter(t => !clearedCheckNos.includes(t.checkNo));
    const totalOC = outstandingList.reduce((sum, item) => sum + item.amount, 0);

    // -----------------------------
    // Deposits in Transit
    // -----------------------------
    const allBookCredits = bookTars.filter(t => t.type === 'Credit' && t.checkNo);
    const clearedBankCredits = bankTars.filter(t => t.type === 'Credit' && t.checkNo).map(b => b.checkNo);
    const depositsInTransit = allBookCredits.filter(bc => !clearedBankCredits.includes(bc.checkNo));
    const totalDeposits = depositsInTransit.reduce((sum, item) => sum + item.amount, 0);

    // -----------------------------
    // Discrepancies
    // -----------------------------
    const bankOnlyDebits = bankTars.filter(b => b.type === 'Debit' && !b.checkNo);
    const bankOnlyCredits = bankTars.filter(
      b => b.type === 'Credit' && !allBookCredits.some(bc => bc.checkNo === b.checkNo)
    );
    const discrepancies = [...bankOnlyDebits, ...bankOnlyCredits];

    // -----------------------------
    // Update Reconciled Status
    // -----------------------------
    for (let bookTr of bookTars) {
      if (bookTr.checkNo) {
        const matchedBank = bankTars.find(b => b.checkNo === bookTr.checkNo);
        if (matchedBank) {
          if (bookTr.status !== 'Reconciled') await Tr.findByIdAndUpdate(bookTr._id, { status: 'Reconciled' });
          if (matchedBank.status !== 'Reconciled') await BankTr.findByIdAndUpdate(matchedBank._id, { status: 'Reconciled' });
        }
      }
    }

    // -----------------------------
    // Adjusted Balances
    // -----------------------------
    const adjBank = bankBal - totalOC + totalDeposits;
    const diff = adjBank - bookBal;

    // -----------------------------
    // Render Page
    // -----------------------------
    res.render('rec', {
      title: 'Reconciliation Reports',
      active: 'rec',
      data: {
        bankBal,
        bookBal,
        totalOC,
        outstandingList,
        depositsInTransit,
        totalDeposits,
        discrepancies,
        adjBank,
        diff,
        selectedMonth,
        selectedYear,
        accountType,
        asOfDate
      },
      months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
      currentYear: now.getFullYear()
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});




// Reconciliation Reports
app.get('/rpt', isLogin, async (req, res) => {
  res.render('rpt', { title: 'Reports', active: 'rpt' });
});


// Change '/transactions' to '/trs' to match your existing GET route
app.post('/newTR', isLogin, isTr, async (req, res) => {
  try {
    const { date, accountType, voucherNo, checkNo, desc, amount, type } = req.body;

    const newTr = new Tr({
      date,
      accountType,
      voucherNo,
      checkNo,
      desc,
      amount,
      type,
      status: 'Recorded', // Default for new entries
      dump: false         // Real data
    });

    await newTr.save();
    
    // Use req.flash if you want to show a success message
    // req.flash('messageSuccess', 'Transaction saved successfully!'); 
    res.redirect('/trs'); // Redirect back to the table view
  } catch (err) {
    console.error('❌ Save Error:', err);
    res.status(500).render('trs', { 
      title: 'Company Transactions', 
      error: 'Failed to save record. Check your inputs.' 
    });
  }
});

app.post('/newBNK', isLogin, isBankTr, async (req, res) => {
  try {
    const { date, accountType, checkNo, desc, amount, type } = req.body;

    const newBankTr = new BankTr({
      date,
      accountType,
      checkNo,
      desc,
      amount,
      type,
      status: 'Recorded', // Default status
      dump: false
    });

    await newBankTr.save();
    
    res.redirect('/bnk');
  } catch (err) {
    console.error(err);
    res.redirect('/bnk');
  }
});

app.post('/editTR', isLogin, isTr, async (req, res) => {
  try {
    const { id, date, accountType, voucherNo, checkNo, desc, amount, type } = req.body;

    // Find the transaction by ID and update
    await Tr.findByIdAndUpdate(id, {
      date,
      accountType,
      voucherNo,
      checkNo,
      desc,
      amount,
      type
    });

    // Redirect back to the transactions page
    res.redirect('/trs');
  } catch (err) {
    console.error('❌ Update Error:', err);
    res.status(500).render('trs', {
      title: 'Company Transactions',
      error: 'Failed to update record. Check your inputs.'
    });
  }
});

app.post('/deleteTR', isLogin, isTr, async (req, res) => {
  try {
    const { id } = req.body;

    await Tr.findByIdAndDelete(id);

    res.redirect('/trs'); // Back to the transactions page
  } catch (err) {
    console.error('❌ Delete Error:', err);
    res.status(500).render('trs', {
      title: 'Company Transactions',
      error: 'Failed to delete record.'
    });
  }
});

app.post('/editBNK', isLogin, async (req, res) => {
  try {
    const { id, date, accountType, checkNo, desc, amount, type } = req.body;

    await BankTr.findByIdAndUpdate(id, {
      date,
      accountType,
      checkNo,
      desc,
      amount,
      type
    });

    res.redirect('/bnk');
  } catch (err) {
    console.error('❌ Update Bank Error:', err);
    res.status(500).send('Failed to update bank transaction');
  }
});

// Delete bank transaction
app.post('/deleteBNK', isLogin, async (req, res) => {
  try {
    const { id } = req.body;
    await BankTr.findByIdAndDelete(id);
    res.redirect('/bnk');
  } catch (err) {
    console.error('❌ Delete Bank Error:', err);
    res.status(500).send('Failed to delete bank transaction');
  }
});




app.use((req, res) => {
  res.status(404);
  res.locals.error = 'Oops! Page cannot be found!';
  console.log(`404 triggered: ${res.locals.error}`);
  res.render('index', { title: 'Invalid URL' });
});

app.use((err, req, res, next) => {
  console.error('⚠️ Error occurred:', err.message);

  // If render failed due to missing template
  if (err.message.includes('Failed to lookup view')) {
    return res.status(404).render('index', {
      title: 'Page Not Found',
      error: `The page you requested does not exist.`
    });
  }
  res.locals.error = 'Oh no! Page is missing!';
  res.status(500).render('index', { 
    title: 'File Missing',
    message: `OH NO! File in Directory is missing!' ${err.message}`,
    error: 'OH NO! File in Directory is missing!'
  });
});


// Sumakses ka dyan boy!
app.listen(PORT, () => {
  console.log(`🚀 Kudos Supreme Ferry! Running at http://localhost:${PORT}`);
});
