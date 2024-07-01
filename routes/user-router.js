const express = require('express')
const router = express.Router()
const user = require('../controller/user/user-controller')
const profile = require('../controller/user/profile-controller')
const passport = require('passport');
const {isLoggedIn,isLoggedOut,isBlockedUser} =  require('../middlewares/auth')
require('dotenv').config()

require('../middlewares/authenticate');


//user home
router.get('/contact',(req,res) => {
    res.render('user/contact-us')
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
//   res.redirect('/home'); // Redirect to dashboard after successful login
// });

// Define routes using the controller
router.get('/auth/google', isLoggedOut, user.googleAuth);

router.get('/auth/google/callback', isLoggedOut,
  passport.authenticate('google', { failureRedirect: '/auth/google/failure' }), user.googleAuthCallback
);

// Define a route for handling Google authentication failures
router.get('/auth/google/failure', user.googleAuthFailure);

// router.get('/dashboard',isLoggedIn,user.home);
router.get('/home',isLoggedIn,user.home);



router.get('/',user.login);

// user login/signup/logout management
router.get('/login',isLoggedOut,user.login);
router.post('/login',user.loginPost);

router.get('/signup',isLoggedOut, user.signup);
router.post('/signup',user.signupPost);

router.get('/logout',isLoggedIn,isBlockedUser,user.userLogout)

//OTP routers
router.get('/signup-otp',isLoggedOut, user.signupOtp);
router.post('/signup-otp', user.signupOtpPost);
router.post('/resend-otp',isLoggedOut,user.resendOtp);

//product routers
router.get('/shop',isLoggedIn,isBlockedUser, user.userShop)
router.get('/product-details/:productId',isLoggedIn,isBlockedUser, user.productDetails)

// profile
router.get('/profile',isLoggedIn,isBlockedUser,profile.profile)
router.get('/edit-profile',isLoggedIn,isBlockedUser,profile.editProfile)
router.patch('/edit-profile',isLoggedIn,isBlockedUser,profile.editProfilePatch);
router.get('/change-password',isLoggedIn,isBlockedUser,profile.changePassword);
router.post('/change-password',isLoggedIn,isBlockedUser,profile.changePasswordPost);
router.get('/add-address',isLoggedIn,isBlockedUser,profile.addAddress);
router.post('/add-address',isLoggedIn,isBlockedUser,profile.addAddressPost);
router.get('/edit-address/:userId/:addressId',isLoggedIn,isBlockedUser, profile.editAddress)
router.patch('/edit-address/:userId/:addressId',isLoggedIn,isBlockedUser, profile.editAddressPatch);
router.delete('/delete-address/:userId/:addressId',isLoggedIn,isBlockedUser, profile.deleteAddress);

// router.post('/edit-address/:userId/:addressId',isLoggedIn,isBlockedUser, profile.postEditAddress)


module.exports = router;