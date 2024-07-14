const mongoose = require("mongoose");
const UserModel = require("../../model/user-model");
const ProductModel = require("../../model/product-model");
const CategoryModel = require("../../model/category-model");
const OrderModel = require("../../model/order-model");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const { sentOtp } = require("../../config/nodeMailer");
const { isBlockedUser } = require("../../middlewares/auth");
const passport = require("passport");

// google authentication
const googleAuth = passport.authenticate("google", {
    scope: ["profile", "email"],
});

const googleAuthCallback = async (req, res) => {

    const user = req.user;

    if (!user) {
        const errorMessage = "Authentication failed, user data is missing."
        return res.render("user/login",{errorMessage,pageTitle:"Login Page"});
    }
    req.session.userId = user._id;
    req.session.email = user.email;
    return res.redirect("/home");
};

const googleAuthFailure = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (userId) {
            const isBlocked = await isBlockedUser(userId);
            if (isBlocked) {
                const errorMessage = "User is blocked. Please contact support."
                return res.render("user/login",{
                    errorMessage,
                    pageTitle: "Login Page"
                });
            }
        }
        const errorMessage = "Google authentication failed. Please try again."
        res.render("user/login",{
            errorMessage,
            pageTitle: "Login Page"
        });
    } catch (error) {
        console.error("Error during failure handling:", error);
        const errorMessage = "An unexpected error occurred. Please try again."
        console.log(errorMessage);
        res.redirect("/login");
    }
};

// password hashing
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
};

// home page
const home = async (req, res) => {
    try {
        let products = await ProductModel.find({ isFeatured: true }).limit(10);
        let item = await ProductModel.find();
        const category = await CategoryModel.find({});
        const gamingCategory = await CategoryModel.findOne({
            name: { $regex: /^gaming$/i },
        });
        const businessCategory = await CategoryModel.findOne({
            name: { $regex: /^business$/i },
        });
        let gamingProducts = null;
        if (gamingCategory) {
            gamingProducts = await ProductModel.find({
                category: gamingCategory._id,
                isFeatured: true,
            }).limit(6);
        }
        let bannerProduct1 = null;
        let bannerProduct2 = null;

        if (gamingCategory) {
            bannerProduct1 = await ProductModel.findOne({
                category: gamingCategory._id,
                isFeatured: true,
            });
        }
        if (businessCategory) {
            bannerProduct2 = await ProductModel.findOne({
                category: businessCategory._id,
                isFeatured: true,
            });
        }

        if (req.session.email) {
            let userData = await UserModel.findOne({
                email: req.session.email,
            });

            if (!userData.isBlocked) {
                res.render("user/index", {
                    item,
                    products,
                    category,
                    userEmail: userData.email,
                    bannerProduct1,
                    bannerProduct2,
                    gamingProducts,
                    pageTitle: "Home Page"
                });
            } else {
                req.session.isBlocked = true;
                return res.redirect("/login?error=blocked");
            }
        }
          
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

//Login
const login = async (req, res) => {
    
    let errorMessage = "";
    try {
        if (req.session.isBlocked) {
            req.session.userId = "";
            req.session.isBlocked = false;
            errorMessage = "Sorry user blocked";
            res.render("user/login", {
                errorMessage,
                pageTitle: "Login Page"
            });
        } else if (req.session.passwordIncorrect) {
            req.session.passwordIncorrect = false;
            errorMessage = "Incorrect Password";
            res.render("user/login", {
                errorMessage,
                pageTitle: "Login Page"
            });
        } else if (req.session.noUser) {
            req.session.noUser = false;
            errorMessage = "Incorrect email or password";
            res.render("user/login", {
                errorMessage,
                pageTitle: "Login Page"
            });
        }
        else {
            res.render("user/login", {
                errorMessage,
                pageTitle: "Login Page"
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json("Internal Server Error");
    }
};

const loginPost = async (req, res) => {
    try {
        const userData = await UserModel.findOne({
            email: req.body.email,
        });

        if (userData) {
            const isPassWordValid = await bcrypt.compare(
                req.body.password,
                userData.password
            );

            if (isPassWordValid) {
                if (userData.isBlocked) {
                    req.session.isBlocked = true;
                    res.redirect("/login");
                } else {
                    req.session.email = req.body.email;
                    req.session.userId = userData._id;
                    res.redirect("/home");
                }
            } else {
                req.session.passwordIncorrect = true;
                res.redirect("/login");
            }
        } else {
            req.session.noUser = true;
            res.redirect("/login");
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json("Internal Server error");
    }
};

//Signup/Register
const signup = (req, res) => {
    res.render("user/signup", {
        errorMessage: "",
        formData: req.body,
        pageTitle: "Signup Page"
    });
};

const signupPost = async (req, res, next) => {
    try {
        const { fullname, email, password, phone } = req.body;
        const existingUser = await UserModel.findOne({ email });
        
        if (existingUser && existingUser.email === email) {
            res.render("user/signup", {
                errorMessage: "Email is already registered!",
                formData: req.body,
                pageTitle: "Signup Page"
            });
        } else {
            let passwordHash = await securePassword(password);

            let user = {
                fullname,
                email,
                password: passwordHash,
                phone,
                isVerified: false,
            };
            req.session.userDetails = {};
            req.session.userDetails = user;
            req.session.otp = sentOtp(email);
            req.session.otpExpiry = Date.now() + 60000;
            res.redirect("/signup-otp");
        }
    } catch (e) {
        console.error(e);
        res.redirect("/signup");
    }
};

const signupOtp = async (req, res) => {
    res.render("user/signup-otp", { pageTitle: "Signup Otp" });
};

const signupOtpPost = async (req, res) => {
    try {
        const { otp } = req.body;
        const user = new UserModel(req.session.userDetails);
        const otpRegister = req.session.otp;
        const otpExpiry = req.session.otpExpiry;

        if (!user) {
            return res.status(400).json({ message: "User session not found." });
        }

        if (otpRegister !== otp || otpExpiry < Date.now()) {
            return res.status(401).json({ message: "Invalid OTP." });
        }

        // OTP verification successful
        user.isVerified = true;
        if (user.otpExpiry < Date.now()) {
            user.otp = null;
        }

        await user.save();

        req.session.email = user.email;
        req.session.userId = user._id;

        res.status(200).json({ message: "",redirectUrl:"/home" });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "An error occurred during verification.",
        });
    }
};


const resendOtp = async (req, res) => {
    try {
        const user = req.session.userDetails || {};
        const { email } = user;

        if (!email) {
            return res
                .status(400)
                .json({ message: "User details not found in session." });
        }

        req.session.otp = null;
        req.session.otpExpiry = null;

        const newOtp = sentOtp(email);
        req.session.otp = newOtp;
        req.session.otpExpiry = Date.now() + 60000;

        res.status(200).json({ message: "OTP resent successfully." });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({
            message: "Failed to resend OTP. Please try again.",
        });
    }
};

const userLogout = (req, res) => {
    // Destroy the session
    req.session.userId="";
    const adminId = req.session?.admin || "";
    if(req.session.userId=="" && adminId==""){
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).send("Error logging out");
            }
            console.log("Session destroyed");
        });
    }
    res.redirect("/login");
};

// // Searching function
// const getSearchQuery = (searchQuery) => {
//     if (searchQuery) {
//         return {
//             $or: [
//                 { productName: { $regex: searchQuery, $options: "i" } },
//                 { brand: { $regex: searchQuery, $options: "i" } }
//             ]
//         };
//     }
//     return {};
// };

const filterProducts =  async (req, res) => {
    try {
        const { page, category, brands, sort } = req.body;
        const limit = 6;
        const skip = (page - 1) * limit;

        let query = {};
        if(category != "all") {
            query.category = category;
        }
        if (brands && brands.length > 0) {
            query.brand = { $in: brands };
        }

        let sortOption = {};
        switch(sort) {
            case 'priceHighToLow':
                sortOption = { price: -1 };
                break;
            case 'priceLowToHigh':
                sortOption = { price: 1 };
                break;
            case 'nameAZ':
                sortOption = { productName: 1 };
                break;
            case 'nameZA':
                sortOption = { productName: -1 };
                break;
            default:
                sortOption = { createdAt: -1 }; //newArrivals
        }

        const products = await ProductModel.find(query)
            .populate('category')
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        const totalProducts = await ProductModel.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        res.json({
            products,
            currentPage: page,
            totalPages,
            totalProducts
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const userShop = async (req, res) => {
    try {
        const perPage = 6;
        const page = 1;

        let products = await ProductModel.find({isFeatured: true})
            .populate("category")
            .limit(perPage);

        const totalProducts = await ProductModel.countDocuments({
            isFeatured: true,
        });
        const category = await CategoryModel.find();
        const totalPages = Math.ceil(totalProducts / perPage);

        const brands = await ProductModel.aggregate([
            {$match:{isFeatured:true}},
            {$group:{_id:'$brand'}},
            {$project:{_id:0,brand:"$_id"}}
        ]);
        const brandNames = brands.map(brand => brand.brand);

        res.render("user/shop", {
            products,
            category,
            currentPage: page,
            totalPages,
            brandNames,
            totalProducts,
            pageTitle: "Shop Page"
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
        const { productId } = req.params;

        // Validate the productId format before using findById
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID format",
            });
        }
        const product = await ProductModel.findById(productId)
            .populate( "category", "name" );
        const category = await CategoryModel.find({});
        if (!product) {
            return res.status(404).json({
                message: "No such product found",
            });
        }
        const relatedProducts = await ProductModel.find({
            category: product.category._id,
            _id: { $ne: product._id },
        });
        
        res.render("user/product-details", {
            product,
            category,
            relatedProducts,
            pageTitle: "Product Detailed Page"
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
    login,
    loginPost,
    signup,
    signupPost,
    signupOtp,
    signupOtpPost,
    resendOtp,
    userLogout,
    userShop,
    filterProducts,
    productDetails
};
