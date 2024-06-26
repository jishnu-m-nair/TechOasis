const express = require('express')
const router = express.Router()
const user = require('../controller/user-controller')
const passport = require('passport');

// const cart = require('../controller/cart-controller')
// const checkout = require('../controller/checkout-controller')
// const wallet = require('../controller/walletController')
const {isLoggedIn,isLoggedOut,isBlockedUser} =  require('../middlewares/auth')
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const randomstring = require('randomstring');
require('dotenv').config()

require('../middlewares/authenticate');


//user home
router.get('/contact',(req,res) => {
    res.render('contact-us')
});

// Google OAuth routes
// router.get('/auth/google',isLoggedOut, passport.authenticate('google', { scope: ['profile', 'email'] }));

// router.get('/auth/google/callback',isLoggedOut, passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
//   // Access user data from req.user
//   const user = req.user;

//   // Store specific data in session if needed
//   req.session.userId = user._id;
//   req.session.email = user.email;

//   // Redirect to the protected route
//   res.redirect('/dashboard'); // Redirect to dashboard after successful login
// });

// Define routes using the controller
router.get('/auth/google', isLoggedOut, user.googleAuth);

router.get('/auth/google/callback', isLoggedOut,
  passport.authenticate('google', { failureRedirect: '/auth/google/failure' }), user.googleAuthCallback
);

// Define a route for handling Google authentication failures
router.get('/auth/google/failure', user.googleAuthFailure);

router.get('/dashboard',isLoggedIn,user.home);

router.get('/myaccount',(req,res)=>{
  res.render('user-account');
})

router.get('/',user.loginpage);

// user login/signup/logout management
router.get('/login',isLoggedOut,user.loginpage);
router.post('/login',user.loginpost);

router.get('/signup',isLoggedOut, user.signuppage);
router.post('/signup',user.postRegister);

router.get('/logout',isLoggedIn,user.userlogout)

//OTP routers
router.get('/otp',isLoggedOut, user.loadOTP);
router.post('/postotp', user.postVerifyOtp);
router.post('/resendOtp',isLoggedOut,user.resendOtp);

// List all products
// router.get('/shop',isLoggedIn, (req,res) =>{
//     res.render('shop');
// })
// router.get('/shop/product',isLoggedIn, (req,res) =>{
//     res.render('user-product-detailed');
// })


//product routers
router.get('/shop',isLoggedIn, user.userShop)
router.get('/productdetails/:productId',isLoggedIn, user.productDetails)

module.exports = router;