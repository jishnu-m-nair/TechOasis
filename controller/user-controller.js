const mongoose = require('mongoose')
// const randomString = require('randomstring');
const UserModel = require("../model/userSchema");
const ProductModel = require("../model/productSchema");
const categoryModel = require("../model/categorySchema");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const { sentOtp } = require('../config/nodeMailer');
const flash = require('connect-flash'); 
// const {isBlockedUser} =  require('../middlewares/auth')

// Import necessary modules
const passport = require('passport');


// const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

// const googleAuthCallback = (req, res) => {
//   // Access user data from req.user
//   const user = req.user;

//   // Store specific data in session if needed
//   req.session.userId = user._id;
//   req.session.email = user.email;

//   // Redirect to the protected route
//   res.redirect('/dashboard'); // Redirect to dashboard after successful login
// };

// // const googleAuthFailure = async (req, res, next) => {
// //   try {
// //       // Here, you may want to check if user is blocked before rendering the failure page
// //       return await isBlockedUser(req, res, next);
// //   } catch (error) {
// //       console.error("Error during failure handling:", error);
// //       res.render('login', { errorMessage: 'Google authentication failed. Please try again.',data : {} });
// //   }
// // };

// const googleAuthFailure = (req, res) => {
//   req.flash('errorMessage', 'Google authentication failed. Please try again.');
//   res.redirect('/login');
// };

const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

const googleAuthCallback = (req, res) => {
  const user = req.user;

  if (!user) {
    req.flash('errorMessage', 'Authentication failed, user data is missing.');
    return res.redirect('/login');
  }

  req.session.userId = user._id;
  req.session.email = user.email;
  console.log('Session userId set:', req.session.userId);

  res.redirect('/dashboard');
};

const googleAuthFailure = async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log('UserId in session:', userId);

    if (userId) {
      const isBlocked = await isBlockedUser(userId);
      if (isBlocked) {
        req.flash('errorMessage', 'User is blocked. Please contact support.');
        console.log('Flash errorMessage set for blocked user:', req.flash('errorMessage'));
        return res.redirect('/login');
      }
    }

    req.flash('errorMessage', 'Google authentication failed. Please try again.');
    console.log('Flash errorMessage set for auth failure:', req.flash('errorMessage'));
    res.redirect('/login');
  } catch (error) {
    console.error("Error during failure handling:", error);
    req.flash('errorMessage', 'An unexpected error occurred. Please try again.');
    console.log('Flash errorMessage set for unexpected error:', req.flash('errorMessage'));
    res.redirect('/login');
  }
};

const securePassword = async (password) => {
    try {
      const passwordHash = await bcrypt.hash(password, 10); // Add await here
      return passwordHash;
    } catch (error) {
      console.log(error.message);
    }
  };

  const home = async (req, res) => {
    try {
  
      let products = await ProductModel.find({isFeatured: true}).limit(10);
      let item = await ProductModel.find();
      const category = await categoryModel.find({});
      const gamingCategory = await categoryModel.findOne({ 
          name: { $regex: /^gaming$/i } 
      });
      const businessCategory = await categoryModel.findOne({ 
          name: { $regex: /^business$/i } 
      });
      let gamingProducts = null;
      if(gamingCategory) {
        gamingProducts = await ProductModel.find({
          category: gamingCategory._id,
          isFeatured: true
      }).limit(6);
      }
      let bannerProduct1 = null;
      let bannerProduct2 = null;

      if (gamingCategory) {
          // Find one featured product in the 'gaming' category
          bannerProduct1 = await ProductModel.findOne({
              category: gamingCategory._id,
              isFeatured: true
          });
      }
      if (businessCategory) {
        // Find one featured product in the 'gaming' category
        bannerProduct2 = await ProductModel.findOne({
            category: businessCategory._id,
            isFeatured: true
        });
      }
  
      if (req.session.email) {
        let userData = await UserModel.findOne({email: req.session.email})
  
        if (!userData.isBlocked) {
          res.render("index", {
            item,
            products,
            category,
            userEmail: userData.email,
            bannerProduct1,
            bannerProduct2,
            gamingProducts
          });
        } else {
          req.session.isBlocked = true;
          return res.redirect('/login');
        }
      } else {
        res.render("index", {
          item,
          products,
          category,
          userEmail: null,
          bannerProduct1,
          bannerProduct2,
          gamingProducts
        })
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        message: "Internal Server Error",
  
      });
  
    }
  };






//login get router
const loginpage = async (req, res) => {
  let errorMessage = ""
    try {
      let data = {
        email: "",
        password: "",
      };
  
      if (req.session.data) {
        data = req.session.data;
      }
  
      if (req.session.isBlocked) {
        req.session.user = false;
        req.session.isBlocked = false;
        errorMessage = "Sorry user blocked";
        res.render("login", {
          err: errorMessage,
          data,
          errorMessage
        });
      } else if (req.session.passwordIncorrect) {
        req.session.passwordIncorrect = false;
        errorMessage = "Incorrect Password";
        res.render("login", {
          err: errorMessage,
          data,
          errorMessage
        });
      } else if (req.session.noUser) {
        req.session.noUser = false;
        errorMessage = "Incorrect email or password";
        res.render("login", {
          err: errorMessage,
          data,
          errorMessage
        });
      }
      // else if (req.session.user) {
      //   res.redirect("/");
      // } 
      else {
        res.render("login", {
          err: "",
          data,
          errorMessage
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json("Internal Server Error");
    }
  };
  
  
  
  // login post
  const loginpost = async (req, res) => {
    try {
      const userData = await UserModel.findOne({
        email: req.body.email,
      });
  
      req.session.data = {};
  
      if (userData) {
        const isPassWordValid = await bcrypt.compare(
          req.body.password,
          userData.password
        );
  
        if (isPassWordValid) {
          if (userData.isBlocked) {
            req.session.isBlocked = true;
            req.session.data = req.body;
            res.redirect("/login");
          } else {
            // req.session.data = req.body
            req.session.userDetails = {
              userId: userData._id,
              email: req.body.email,
            };
            req.session.email = req.body.email;
            req.session.userId = userData._id
            res.redirect("/dashboard");
          }
        } else {
          // Password does not match
          req.session.passwordIncorrect = true;
          req.session.data = req.body;
          res.redirect("/login");
        }
      } else {
        // User not found
        req.session.noUser = true;
        req.session.data = req.body;
        res.redirect("/login");
      }
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json("Internal Server error");
    }
  };
  
//   signup get
  let signuppage =  (req, res) => {
    let data = {
      fullname: "",
      email: "",
      phone: "",
      password: "",
    };
  
    if (req.session.data) {
      data = req.session.data;
  
      res.render("register", {
        error: req.flash("error"),
        data,
        errorMessage:"",
        formData: req.body
      });
    } else {
      res.render("register", {
        error: req.flash("error"),
        data,
        errorMessage:"",
        formData: req.body
      });
    }
  };



// signupPage post
const postRegister = async (req, res, next) => {
  try {
    const { fullname, email, password, phone } = req.body;


    req.session.data = {};
    // Check if either the email or phone number is already registered
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      if (existingUser.email === email && existingUser.phone == phone) {
        res.render('register',{errorMessage:"Email and phone number is already registered",formData: req.body});
      } else if (existingUser.email === email) {
        res.render('register',{errorMessage:"Email is already registered!",formData: req.body});
      }
    } else {
      let passwordHash = await securePassword(password);
      
      let user = {
        fullname,
        email,
        password: passwordHash,
        phone,
        isVerified: false
        };
      req.session.userDetails = user;
      req.session.otp = sentOtp(email);
      req.session.otpExpiry = Date.now() + 60000;
      res.redirect("/otp");
    }
  } catch (e) {
    console.error(e);
    res.redirect("/signup");
  }
};



const postVerifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = new UserModel(req.session.userDetails);
    const otpRegister = req.session.otp;
    // const user = req.session.userDetails; // Retrieve user details from session
    const otpExpiry = req.session.otpExpiry;
    if (!user) {
      return res.status(400).json({ message: "User session not found." });
    }

    if (otpRegister !== otp || user.otpExpiry < Date.now()) {
    // if (otpRegister !== otp ) {
      return res.status(401).json({ message: "Invalid OTP." });
      // return res.render('otp',{err:"Invalid or expired OTP."});
    }

    // OTP verification successful
    user.isVerified = true;
    if(user.otpExpiry < Date.now()) {
      user.otp = null;
    }

    // await user.save(); // Persist user updates

    req.session.destroy(); // Destroy session (optional)

    res.status(200).json({ message: "OTP verification successful." }); // Success message
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred during verification." });
  }
};


const loadOTP = async (req, res) => {
  try {
    // Check for OTP expiration and incorrect OTP in one step
    const hasError = req.session.otpExpired || req.session.otpFalse;

    // Clear both flags regardless of error
    req.session.otpExpired = false;
    req.session.otpFalse = false;

    const errorMessage = hasError ? (req.session.otpExpired ? "OTP expired. Please request a new one." : "Incorrect OTP") : "";

    res.render("otp", { err: errorMessage }); // Render OTP page with error message (if any)
  } catch (error) {
    console.error(error.message); // Log the error for debugging
    res.status(500).send("An error occurred loading the OTP page.");
  }
};



// let resendOtp = async (req, res) => {
//   // Clear the existing timeout
//   clearTimeout(expire);
  
//   // Reset OTP and start a new timeout
//   req.session.otp = sentOtp(req.session.emailSignup);
//   otpNull(req, res);
  
//   res.status(200).json({
//     status: true
//   });
// };

// Controller method to handle OTP resending
// const resendOtp = async (req, res) => {
//   clearTimeout(expire);

//   const email = req.session.emailSignup;
//   if (!email) {
//     return res.render('otp', { err: 'Email not found. Please login again.' });
//   }

//   req.session.otp = sentOtp(email);
//   otpNull(req);

//   res.status(200).json({ status: true });
// };

// const resendOtp = async (req, res) => {
//   clearTimeout(expireOTP);

//   const email = req.session.emailSignup;
//   if (!email) {
//     return res.status(400).json({ status: false, message: 'Email not found. Please login again.' });
//   }

//   req.session.otp = sentOtp(email);
//   otpNull(req);

//   return res.status(200).json({ status: true, message: 'OTP has been resent successfully!' });
// };
const resendOtp = async (req, res) => {
  try {
    const user = req.session.userDetails || {};
    const { email } = user;

    if (!email) {
      return res.status(400).json({ message: "User details not found in session." });
    }

    // Invalidate the previous OTP
    user.otp = null;
    user.otpExpiry = null;

    // Send a new OTP and set its expiration time
    const newOtp = sentOtp(email);
    user.otp = newOtp;
    user.otpExpiry = Date.now() + 60000 ; // OTP expiration time (10 seconds)

    res.status(200).json({ message: "OTP resent successfully." });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ message: "Failed to resend OTP. Please try again." });
  }
};

const userlogout = (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      // Handle errors gracefully (e.g., redirect to an error page)
      return res.status(500).send('Error logging out');
    }

    console.log('Session destroyed');
    res.redirect('/login'); // Redirect to login page
  });
};


const userShop = async (req, res) => {
  try {

    const perPage = 8; // Define how many products you want per page
    const page = parseInt(req.query.page) || 1; // Get the page number from the request query parameters
    // const sortOption = req.query.sort || 'featured'; // Get the sort option from the request query parameters or default to 'featured
    const selectedCategory = req.query.category || null;
    const searchQuery = req.query.search || '';
    const id = req.params.productId;

    let query = {
      isFeatured: true,
      $or: [{
          productName: {
            $regex: searchQuery,
            $options: 'i'
          }
        },
        {
          brand: {
            $regex: searchQuery,
            $options: 'i'
          }
        },
      ],
    };


    
    // if (sortOption === 'lowToHigh') {
    //   sortCriteria = {
    //     afterDiscount: 1
    //   };
    // } else if (sortOption === 'highToLow') {
    //   sortCriteria = {
    //     afterDiscount: -1
    //   };
    // } else if (sortOption === 'releaseDate') {
    //   sortCriteria = {
    //     createdAt: -1
    //   }; // or any other field for release date
    // } else if (sortOption === 'avgRating') {
    //   sortCriteria = {
    //     rating: -1
    //   }; // or any other field for average rating
    // } else {
    //   // Default to 'featured' or any other default sorting option
    //   sortCriteria = {
    //     createdAt: -1
    //   }; // Default sorting
    // }


    
    // if (selectedCategory && mongoose.Types.ObjectId.isValid(selectedCategory)) {
    //   query.category = new mongoose.Types.ObjectId(selectedCategory);
    // }
    let sortCriteria = {};
    let products = await ProductModel.find(query)
      // .populate("category", "name")
      .populate({
        path: "category",
        select: "name",
        match: {
          _id: new mongoose.Types.ObjectId(selectedCategory)
        }, // Add this match condition
      })
      .sort(sortCriteria)
      .skip(perPage * (page - 1))
      .limit(perPage);

    // Reset filterProduct when the page changes
    // if (!req.query.category && page > 1) {
    //   req.session.filterProduct = null;
    // }


    const totalProducts = await ProductModel.countDocuments({isFeatured: true});
    // const totalProducts = await ProductModel.countDocuments(query);


    // Retrieve products based on the latest update timestamp
    // const latestProducts = await ProductModel.find({
    //     isFeatured: true
    //   })
    const latestProducts = await ProductModel.find({
        isFeatured: true
      })
      .populate("category", "name")
      .sort({
        createdAt: -1
      }) // Sort by the most recent updates
      .limit(3); // Retrieve the latest 3 products

    const category = await categoryModel.find();


    // Calculate the total number of pages
    const totalPages = Math.ceil(totalProducts / perPage);

    // if (req.session.filterProduct) {
    //   products = req.session.filterProduct
    // }

    res.render("shop", {
      products,
      newProducts: latestProducts,
      category,
      currentPage: page,
      totalPages,
      // sortOption,
      selectedCategory: selectedCategory,
      searchQuery: searchQuery,
      totalProducts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Some error caused while rendering shop page",
    });
  }
};

const productDetails = async (req, res) => {
  try {
    const {productId} = req.params;

    // Validate the productId format before using findById
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID format",
      });
    }
    const product = await ProductModel.findById(productId).populate("category", "name");
    const category = await categoryModel.find({});
    if (!product) {
      // Handle the case where the product with the specified id is not found
      return res.status(404).json({
        message: "No such product found",
      });
    }
    const relatedProducts = await ProductModel.find({
      category: product.category._id, // Use the product's category ID
      _id: { $ne: product._id } // Exclude the current product
    });
    // Render a template to display the product details
    res.render("user-product-detailed", {
      product,
      category,
      relatedProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      errorMessage: error.message,
    });
  }
};

module.exports = {
  googleAuth,
  googleAuthCallback,
  googleAuthFailure,
  home,
  securePassword,
  loginpage,
  loginpost,
  signuppage,
  postRegister,
  postVerifyOtp,
  loadOTP,
  resendOtp,
  userlogout,
  userShop,
  productDetails
}