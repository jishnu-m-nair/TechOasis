const express = require('express');
const session = require('express-session');
const flash = require('connect-flash'); 
const logger = require('morgan');
const path = require('path');
const passport = require('passport');
const createError = require('http-errors');
const nocache = require('nocache');
require('dotenv').config();

const connectdb = require('./config/dbconnect');
const userRouter = require('./routes/user-router');
const adminRouter = require('./routes/admin-router');

// Initialize Express app
const app = express();

// Connect to database
connectdb();

// Logger
// app.use(logger('dev'));
app.use(nocache());
// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret', // Use environment variable for the secret
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevents JavaScript from accessing the cookies
    sameSite: 'lax' // Prevents the browser from sending this cookie along with cross-site requests
  }
}));

// Flash middleware
app.use(flash());

app.use((req, res, next) => {
  res.locals.errorMessage = req.flash('errorMessage');
  res.locals.successMessage = req.flash('successMessage');
  next();
});

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public', 'uploads')));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route handlers
app.use('/', userRouter);
app.use('/', adminRouter);
app.use("*",(req,res,next)=>{
    res.render("404");
})

// Start server
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Server started on PORT: ${PORT}`);
});
