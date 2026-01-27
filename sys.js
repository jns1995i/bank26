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
const XLSX = require('xlsx');
const upload = multer({ dest: 'uploads/' });

const isLogin = require('./middleware/isLogin');
const isTr = require('./middleware/isTr');
const isBankTr = require('./middleware/isBankTr');
const isReco = require('./middleware/isReco');
const isOut = require('./middleware/isOut');

const Tr = require('./model/tr');
const BankTr = require('./model/banktr');
const Reco = require('./model/reco');
const Users = require('./model/user');
const Out = require('./model/out');

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

app.get('/out', isLogin, isOut, async (req, res) => {
  res.render('out', { title: 'Outstanding Checks', active: 'out' });
});

app.get('/prf', isLogin, async (req, res) => {
  res.render('prf', { title: 'Profile', active: 'prf' });
});

const SettingsSchema = new mongoose.Schema({
    accountType: { type: String, required: true, unique: true }, // Added this
    bookBeginning: { type: Number, default: 0 },
    bankBeginning: { type: Number, default: 0 }
});

const Settings = mongoose.model('Settings', SettingsSchema);

// Route to update the balances
app.post('/update-settings', async (req, res) => {
    try {
        const { accountType, bookBeginning, bankBeginning } = req.body;
        
        // Use accountType in the filter so it updates the correct record
        await Settings.findOneAndUpdate(
            { accountType: accountType }, 
            { 
                bookBeginning: parseFloat(bookBeginning) || 0, 
                bankBeginning: parseFloat(bankBeginning) || 0 
            }, 
            { upsert: true, new: true }
        );

        // Redirect back with the account type so the user stays on the same page
        res.redirect(`/rec?accountType=${accountType}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating balances");
    }
});

app.get('/rec', isLogin, isBankTr, isTr, isOut, async (req, res) => {
  try {
    const now = new Date();

    // Filters
    const selectedMonth = req.query.month !== undefined ? Number(req.query.month) : now.getMonth();
    const selectedYear = req.query.year !== undefined ? Number(req.query.year) : now.getFullYear();
    const accountType = req.query.accountType || 'GOF';
    const asOfDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

    // --- NEW LOGIC START: Get Beginning Balances ---
    // This fetches the starting numbers you saved in your settings
    const settings = await Settings.findOne({ accountType }) || { bookBeginning: 0, bankBeginning: 0 };
    // --- NEW LOGIC END ---

    // 1. Fetch Transactions + Manual Outstanding Checks
    const bookTars = await Tr.find({ accountType, date: { $lte: asOfDate } });
    const bankTars = await BankTr.find({ accountType, date: { $lte: asOfDate } });
    
    const manualOuts = await Out.find({ 
        accountType, 
        date: { $lte: asOfDate },
        archive: false 
    });

    // --- UPDATED: Using settings as the seed for reduce ---
    const bookBal = bookTars.reduce((acc, curr) => curr.type === 'Credit' ? acc + curr.amount : acc - curr.amount, settings.bookBeginning);
    const bankBal = bankTars.reduce((acc, curr) => curr.type === 'Credit' ? acc + curr.amount : acc - curr.amount, settings.bankBeginning);

    // 2. REVISED: Outstanding Checks Logic
    const clearedCheckNos = bankTars
        .filter(t => t.type === 'Debit' && t.checkNo)
        .map(b => b.checkNo);

    const bookChecks = bookTars.filter(t => t.type === 'Debit' && t.checkNo && !clearedCheckNos.includes(t.checkNo));
    const manualChecks = manualOuts.filter(m => !clearedCheckNos.includes(m.checkNo));

    const combinedOutstanding = [...bookChecks];
    manualChecks.forEach(mc => {
        if (!combinedOutstanding.some(bc => bc.checkNo === mc.checkNo)) {
            combinedOutstanding.push(mc);
        }
    });

    const totalOC = combinedOutstanding.reduce((sum, item) => sum + item.amount, 0);

    // 3. Deposits in Transit
    const allBookCredits = bookTars.filter(t => t.type === 'Credit' && t.checkNo);
    const clearedBankCredits = bankTars.filter(t => t.type === 'Credit' && t.checkNo).map(b => b.checkNo);
    const depositsInTransit = allBookCredits.filter(bc => !clearedBankCredits.includes(bc.checkNo));
    const totalDeposits = depositsInTransit.reduce((sum, item) => sum + item.amount, 0);

    // 4. Discrepancies
    const bankOnlyDebits = bankTars.filter(b => b.type === 'Debit' && !b.checkNo);
    const bankOnlyCredits = bankTars.filter(
      b => b.type === 'Credit' && !allBookCredits.some(bc => bc.checkNo === b.checkNo)
    );
    const discrepancies = [...bankOnlyDebits, ...bankOnlyCredits];

    // 5. Update Reconciled Status
    for (let check of combinedOutstanding) {
        const matchedBank = bankTars.find(b => b.checkNo === check.checkNo);
        if (matchedBank) {
            if (check.status !== 'Reconciled') await Tr.findByIdAndUpdate(check._id, { status: 'Reconciled' });
            if (matchedBank.status !== 'Reconciled') await BankTr.findByIdAndUpdate(matchedBank._id, { status: 'Reconciled' });
            
            if (check.constructor.modelName === 'out') {
                await Out.findByIdAndUpdate(check._id, { status: 'Cleared' });
            }
        }
    }

    // 6. Adjusted Balances
    const adjBank = bankBal - totalOC + totalDeposits;
    const diff = adjBank - bookBal;

    res.render('rec', {
      title: 'Reconciliation Reports',
      active: 'rec',
      data: {
        settings, // Added so you can show Beginning Balances in the UI
        bankBal,
        bookBal,
        totalOC,
        outstandingList: combinedOutstanding,
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

app.post('/newOUT', isLogin, async (req, res) => {
    try {
        await Out.create(req.body);
        res.redirect('/out');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving manual check");
    }
});

// Edit Existing Manual Check
app.post('/editOUT', isLogin, async (req, res) => {
    try {
        const { id, ...updateData } = req.body;
        await Out.findByIdAndUpdate(id, updateData);
        res.redirect('/out');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating check");
    }
});

// Delete Manual Check
app.post('/deleteOUT', isLogin, async (req, res) => {
    try {
        await Out.findByIdAndDelete(req.body.id);
        res.redirect('/out');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting check");
    }
});

app.post('/importExcel', upload.single('excelFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');

        const workbook = XLSX.readFile(req.file.path);
        let totalImported = 0;

        const parseDate = (val) => {
            if (!val) return null;
            let d = (typeof val === 'number') ? new Date(Math.round((val - 25569) * 86400 * 1000)) : new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        // Helper to find sheet regardless of capitalization
        const getSheet = (name) => {
            const found = workbook.SheetNames.find(s => s.toLowerCase().trim() === name.toLowerCase());
            return found ? workbook.Sheets[found] : null;
        };

        // 1. PROCESS BOOK
        const bookSheet = getSheet('book');
        if (bookSheet) {
            // Use header: 1 to get a simple array of arrays (no header names needed)
            const rows = XLSX.utils.sheet_to_json(bookSheet, { header: 1 });
            const entries = rows.slice(1).map(row => { // .slice(1) skips the first header row
                const dateVal = parseDate(row[0]); // Column A
                const inflow = parseFloat(row[6] || 0); // Column G
                const outflow = parseFloat(row[7] || 0); // Column H
                if (!dateVal || (inflow === 0 && outflow === 0)) return null;

                return {
                    date: dateVal,
                    accountType: row[1] || req.body.accountType || 'GOF', // Column B
                    checkNo: row[2] ? String(row[2]).trim() : "", // Column C
                    voucherNo: row[3] ? String(row[3]).trim() : "", // Column D
                    desc: `${row[4] || ''} - ${row[5] || ''}`.trim(), // Col E & F
                    amount: inflow || outflow,
                    type: inflow > 0 ? 'Credit' : 'Debit',
                    status: 'Recorded',
                    dump: true
                };
            }).filter(e => e !== null);
            if (entries.length) { await Tr.insertMany(entries); totalImported += entries.length; }
        }

        // 2. PROCESS BANK
        const bankSheet = getSheet('bank');
        if (bankSheet) {
            const rows = XLSX.utils.sheet_to_json(bankSheet, { header: 1 });
            const entries = rows.slice(1).map(row => {
                const dateVal = parseDate(row[0]);
                const dr = parseFloat(row[4] || 0); // Column E
                const cr = parseFloat(row[5] || 0); // Column F
                if (!dateVal || (dr === 0 && cr === 0)) return null;

                return {
                    date: dateVal,
                    accountType: row[1] || req.body.accountType || 'GOF',
                    checkNo: row[2] ? String(row[2]).trim() : "",
                    desc: row[3] || "Bank Transaction",
                    amount: dr || cr,
                    type: dr > 0 ? 'Debit' : 'Credit',
                    status: 'Recorded',
                    dump: true
                };
            }).filter(e => e !== null);
            if (entries.length) { await BankTr.insertMany(entries); totalImported += entries.length; }
        }

        // 3. PROCESS OC
        const ocSheet = getSheet('oc');
        if (ocSheet) {
            const rows = XLSX.utils.sheet_to_json(ocSheet, { header: 1 });
            const entries = rows.slice(1).map(row => {
                const dateVal = parseDate(row[0]);
                const amt = parseFloat(row[5] || 0); // Column F
                if (!dateVal || amt === 0) return null;

                return {
                    date: dateVal,
                    accountType: row[1] || 'GOF',
                    checkNo: row[2] ? String(row[2]).trim() : "",
                    payee: row[3] || "Unknown",
                    particulars: row[4] || "",
                    amount: amt,
                    status: 'Outstanding',
                    dump: true
                };
            }).filter(e => e !== null);
            if (entries.length) { await Out.insertMany(entries); totalImported += entries.length; }
        }

        res.redirect(`/rec?success=Imported ${totalImported} records`);
    } catch (err) {
        console.error("IMPORT ERROR:", err);
        res.status(500).send('System Error during import.');
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
