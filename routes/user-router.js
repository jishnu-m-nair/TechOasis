const express = require('express')
const router = express.Router()
const user = require('../controller/user/user-controller')
const profile = require('../controller/user/profile-controller')
const cart = require('../controller/user/cart-controller')
const checkout = require('../controller/user/checkout-controller')
const wishlist = require('../controller/user/wishlist-controller');
const passport = require('passport');
const { isLoggedIn, isLoggedOut } = require('../middlewares/auth')
const { cartWishlistCount } = require('../utils/helpers')
require('dotenv').config()
require('../middlewares/authenticate');

//user home
router.get('/contact', (req, res) => {
	res.render('user/contact-us', { pageTitle: "Contact Page" })
});

// Define routes using the controller
router.get('/auth/google', isLoggedOut, user.googleAuth);

router.get('/auth/google/callback', isLoggedOut,
	passport.authenticate('google', { failureRedirect: '/auth/google/failure' }), user.googleAuthCallback
);

// Define a route for handling Google authentication failures
router.get('/auth/google/failure', isLoggedOut, user.googleAuthFailure);

router.get('/home', isLoggedIn, user.home);

router.get('/', isLoggedOut, user.login);

// user login/signup/logout management
router.get('/login', isLoggedOut, user.login);
router.post('/login', isLoggedOut, user.loginPost);

router.get('/signup', isLoggedOut, user.signup);
router.post('/signup', isLoggedOut, user.signupPost);

router.get('/logout', user.userLogout)

// forgot-password
router.get('/forgot-password', isLoggedOut, user.forgotPassword);
router.post('/forgot-password', isLoggedOut, user.forgotPasswordPost);
router.get('/reset-password', isLoggedOut, user.resetPassword);
router.post('/reset-password', isLoggedOut, user.resetPasswordPost);

//OTP routers
router.get('/signup-otp', isLoggedOut, user.signupOtp);
router.post('/signup-otp', isLoggedOut, user.signupOtpPost);
router.post('/resend-otp', isLoggedOut, user.resendOtp);

// wishlist & cart count
router.get('/cart-wishlist-count', cartWishlistCount);

//product routers
router.get('/shop', isLoggedIn, user.userShop)
router.get('/product-details/:productId', isLoggedIn, user.productDetails)
router.post('/api/products', user.filterProducts);

// Cart Routers
router.post('/add-to-cart', isLoggedIn, cart.addTocart);
router.get('/cart', isLoggedIn, cart.showcart);
router.post('/cart-delete', isLoggedIn, cart.deleteCart);
router.post('/update-cart-quantity', isLoggedIn, cart.updateCart);
router.get('/latest-cart', isLoggedIn, cart.latestCart);

// Profile
router.get('/profile', isLoggedIn, profile.profile)
router.get('/edit-profile', isLoggedIn, profile.editProfile)
router.patch('/edit-profile', isLoggedIn, profile.editProfilePatch);
router.get('/change-password', isLoggedIn, profile.changePassword);
router.post('/change-password', isLoggedIn, profile.changePasswordPost);
router.get('/add-address', isLoggedIn, profile.addAddress);
router.post('/add-address', isLoggedIn, profile.addAddressPost);
router.get('/edit-address/:addressId', isLoggedIn, profile.editAddress)
router.patch('/edit-address/:addressId', isLoggedIn, profile.editAddressPatch);
router.get('/edit-address/:addressId', isLoggedIn, profile.editAddress)
router.patch('/edit-address/:addressId', isLoggedIn, profile.editAddressPatch);
router.delete('/delete-address/:addressId', isLoggedIn, profile.deleteAddress);
router.get('/api/filter/orders', isLoggedIn, profile.filterOrders);
router.get('/api/filter/transactions', isLoggedIn, profile.filterTransactions);

//checkout
router.get('/checkout', isLoggedIn, checkout.orderCheckout)
router.post('/checkout', isLoggedIn, checkout.orderCheckoutPost)
router.post('/payment-success',isLoggedIn, checkout.handlePaymentSuccess)
router.post('/payment-failure',isLoggedIn, checkout.handlePaymentFailure)
router.get('/api/available-coupons', isLoggedIn, checkout.availableCoupons);
router.post('/api/apply-coupon', isLoggedIn, checkout.applyCoupon);
router.post('/api/remove-coupon', isLoggedIn, checkout.removeCoupon);

// order
router.get('/order-details/:orderId', isLoggedIn, checkout.orderDetailsGet)
router.post('/retry-payment/:orderId',isLoggedIn,checkout.retryPayment)
router.post('/success-retry-payment', isLoggedIn, checkout.successRetryPayment);
router.post('/api/cancel-order', isLoggedIn, checkout.cancelOrder);
router.post('/api/return-order', isLoggedIn, checkout.returnOrder);
router.get('/order-confirmation/:orderId', isLoggedIn, checkout.orderConfirmGet)

// wishlist
router.get('/wishlist', isLoggedIn, wishlist.loadWishlist);
router.post('/api/add-to-wishlist', isLoggedIn, wishlist.addToWishlist);
router.post('/api/remove-from-wishlist', isLoggedIn, wishlist.removeWishlist);

module.exports = router;