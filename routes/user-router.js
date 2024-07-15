const express = require('express')
const router = express.Router()
const user = require('../controller/user/user-controller')
const profile = require('../controller/user/profile-controller')
const cart = require('../controller/user/cart-controller')
const checkout = require('../controller/checkout-controller')
const passport = require('passport');
const {isLoggedIn,isLoggedOut,isBlockedUser} =  require('../middlewares/auth')
require('dotenv').config()
require('../middlewares/authenticate');

//user home
router.get('/contact',(req,res) => {
    res.render('user/contact-us',{ pageTitle: "Contact Page" })
});

// Define routes using the controller
router.get('/auth/google',isLoggedOut, user.googleAuth);

router.get('/auth/google/callback',isLoggedOut,
  passport.authenticate('google', { failureRedirect: '/auth/google/failure' }), user.googleAuthCallback
);

// Define a route for handling Google authentication failures
router.get('/auth/google/failure',isLoggedOut, user.googleAuthFailure);

router.get('/home',isLoggedIn,isBlockedUser,user.home);

router.get('/',user.login);

// user login/signup/logout management
router.get('/login',isLoggedOut,user.login);
router.post('/login',user.loginPost);

router.get('/signup',isLoggedOut, user.signup);
router.post('/signup',user.signupPost);

router.get('/logout',user.userLogout)

//OTP routers
router.get('/signup-otp',isLoggedOut, user.signupOtp);
router.post('/signup-otp', user.signupOtpPost);
router.post('/resend-otp',isLoggedOut,user.resendOtp);

//product routers
router.get('/shop',isLoggedIn,isBlockedUser, user.userShop)
router.get('/product-details/:productId',isLoggedIn,isBlockedUser, user.productDetails)
router.post('/api/products',user.filterProducts);

// Cart Routers
router.post('/add-to-cart',isLoggedIn,isBlockedUser,cart.addTocart);
router.get('/cart',isLoggedIn,isBlockedUser,cart.showcart);
router.post('/cart-delete',isLoggedIn,isBlockedUser,cart.deleteCart);
router.post('/update-cart-quantity',isLoggedIn,isBlockedUser,cart.updateCart);
router.get('/latest-cart',isLoggedIn,isBlockedUser,cart.latestCart);
// router.post('/addtocartIn',cart.addToCartIn);

// Profile
router.get('/profile',isLoggedIn,isBlockedUser,profile.profile)
router.get('/edit-profile',isLoggedIn,isBlockedUser,profile.editProfile)
router.patch('/edit-profile',isLoggedIn,isBlockedUser,profile.editProfilePatch);
router.get('/change-password',isLoggedIn,isBlockedUser,profile.changePassword);
router.post('/change-password',isLoggedIn,isBlockedUser,profile.changePasswordPost);
router.get('/add-address',isLoggedIn,isBlockedUser,profile.addAddress);
router.post('/add-address',isLoggedIn,isBlockedUser,profile.addAddressPost);
router.get('/edit-address/:userId/:addressId',isLoggedIn,isBlockedUser, profile.editAddress)
router.patch('/edit-address/:userId/:addressId',isLoggedIn,isBlockedUser, profile.editAddressPatch);
router.get('/edit-address/:addressId',isLoggedIn,isBlockedUser, profile.editAddress)
router.patch('/edit-address/:addressId',isLoggedIn,isBlockedUser, profile.editAddressPatch);
router.delete('/delete-address/:addressId',isLoggedIn,isBlockedUser, profile.deleteAddress);

//checkout
router.get('/checkout',isLoggedIn,isBlockedUser, checkout.orderCheckout)
router.post('/checkout',isLoggedIn,isBlockedUser,checkout.orderCheckoutPost)

// order confirmation
router.get('/order-confirmation/:orderId',isLoggedIn,isBlockedUser,checkout.orderConfirmGet)
router.get('/order-details/:orderId',isLoggedIn,isBlockedUser,checkout.orderDetailsGet)
router.post('/api/cancel-order',isLoggedIn,isBlockedUser, checkout.cancelOrderRequest);


module.exports = router;