const mongoose = require("mongoose");
const UserModel = require("../../model/user-model");
const ProductModel = require("../../model/product-model");
const CategoryModel = require("../../model/category-model");
const WalletModel = require("../../model/wallet-model");
const { securePassword, generateReferralCode } = require("../../utils/helpers");

const bcrypt = require("bcryptjs");
require("dotenv").config();
const { sentOtp } = require("../../config/nodeMailer");
const passport = require("passport");
const categoryModel = require("../../model/category-model");

// google authentication
const googleAuth = passport.authenticate("google", {
    scope: ["profile", "email"],
});

const googleAuthCallback = async (req, res) => {

    const user = req.user;

    if (!user) {
        const errorMessage = "Authentication failed, user data is missing."
        return res.render("user/login",{
            errorMessage,
            pageTitle:"Login Page"
        });
    }
    req.session.userId = user._id;
    req.session.email = user.email;
    return res.redirect("/home");
};

const googleAuthFailure = async (req, res) => {
    try {
        const errorMessage = "User is blocked. Please contact support."
        res.render("user/login",{
            errorMessage,
            pageTitle: "Login Page"
        });
    } catch (error) {
        const errorMessage = "An unexpected error occurred. Please try again later."
        res.redirect(`/login?error=${errorMessage}`);
    }
};

// home page
const home = async (req, res) => {
    try {
        let products = await ProductModel.find({
            isFeatured: true
        })
        .populate({
            path:"category",
            match:{ isFeatured: true }
        })
        .sort({ createdAt: -1 })
        .limit(10);
        
        products = products.filter(product => product.category !== null);
        const category = await CategoryModel.find({ isFeatured: true });
        const gamingCategory = await CategoryModel.findOne({
            name: { $regex: /^gaming$/i },
            isFeatured: true
        });
        const businessCategory = await CategoryModel.findOne({
            name: { $regex: /^business$/i },
            isFeatured: true
        });
        let bannerProduct1 = null;
        if (gamingCategory) {
            bannerProduct1 = await ProductModel.findOne({
                category: gamingCategory._id,
                isFeatured: true,
            });
        }
        let bannerProduct2 = null;
        if (businessCategory) {
            bannerProduct2 = await ProductModel.findOne({
                category: businessCategory._id,
                isFeatured: true,
            });
        }
        let singleCategory = null;
        singleCategory = await categoryModel.findOne({ isFeatured: true });
        let singleCategoryProducts = null;
        if(singleCategory) {
            singleCategoryProducts = await ProductModel
                .find({
                    category:singleCategory._id,
                    isFeatured:true
                })
                .populate("category","name")
                .limit(6);

        }
        res.render("user/index", {
            products,
            category,
            bannerProduct1,
            bannerProduct2,
            singleCategoryProducts,
            pageTitle: "Home Page"
        });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
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
        res.render('500', { errorMessage: 'Internal Server Error' })
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
        res.render('500', { errorMessage: 'Internal Server Error' })
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
        const { fullname, email, password, phone, } = req.body;
        const existingUser = await UserModel.findOne({ email });

        if (existingUser && existingUser.email === email) {
            return res.render("user/signup", {
                errorMessage: "Email is already registered!",
                formData: req.body,
                pageTitle: "Signup Page"
            });
        }
        let referralCode = req.body.referralCode;
        referralCode = referralCode.toUpperCase();
        
        let referrer = null;
        if (referralCode) {
            referrer = await UserModel.findOne({ referralCode });
            if (!referrer) {
                return res.render("user/signup", {
                    errorMessage: "Invalid referral code!",
                    formData: req.body,
                    pageTitle: "Signup Page"
                });
            }
        }

        let passwordHash = await securePassword(password);
        if(!passwordHash){
            return res.render('500',{ errorMessage: "Password hashing has a problem" })
        }

        const newReferralCode = await generateReferralCode(8);

        let user = {
            fullname,
            email,
            password: passwordHash,
            phone,
            isVerified: false,
            referralCode: newReferralCode,
            referredBy: referrer ? referrer._id : ''
        };
        req.session.userDetails = {};
        req.session.userDetails = user;
        req.session.email = user.email;
        req.session.referralCode = referralCode;
        req.session.otp = sentOtp(email);
        req.session.otpExpiry = Date.now() + 60000;
        res.redirect("/signup-otp");
    } catch (e) {
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

        const referralCode = req.session.referralCode
        if (referralCode) {
            const referringUser = await UserModel.findOne({ referralCode }) || null;
            if (referringUser) {
                const userWallet = new WalletModel({
                    owner: user._id,
                    balance: 100,
                    transactions: [{
                        amount: 100,
                        type: "credit",
                        reason: `Welcome bonus`
                    }]
                });
                await userWallet.save();
        
                const referrerWallet = await WalletModel.findOne({ owner: referringUser._id });
                if (referrerWallet) {
                    referrerWallet.balance += 500;
                    referrerWallet.transactions.push({ 
                        amount: 500, 
                        type: "credit", 
                        reason: `Bonus for referring ${user.fullname}`
                    });
                    await referrerWallet.save();
                }
            } else {
                const userWallet = new WalletModel({
                    owner: user._id,
                    balance: 0,
                    transactions: []
                })
                await userWallet.save();
            }
        } else {
            const userWallet = new WalletModel({
                owner: user._id,
                balance: 0,
                transactions: []
            })
            await userWallet.save();
        }

        delete req.session.userDetails;
        delete req.session.referralCode;
        delete req.session.otp;
        delete req.session.otpExpiry;
        

        res.status(200).json({ message: "",redirectUrl:"/home" });
    } catch (error) {
        res.status(500).json({
            message: "An error occurred during verification.",
        });
    }
};


const resendOtp = async (req, res) => {
    try {
        const { email } = req.session;

        if (!email) {
            return res
                .status(400)
                .json({ message: "User details not found in session." });
        }

        const newOtp = sentOtp(email);
        req.session.otp = newOtp;
        req.session.otpExpiry = Date.now() + 60000;

        res.status(200).json({ message: "OTP resent successfully." });
    } catch (error) {
        res.status(500).json({
            message: "Failed to resend OTP. Please try again.",
        });
    }
};
const forgotPassword = async (req,res)=>{
    try {
        res.render('user/forgot-password',{ pageTitle: "Forgot Password" })
    } catch (error) {
        res.render('500');
    }
}
const forgotPasswordPost = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    try {
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        req.session.otp = sentOtp(email);
        req.session.otpExpiry = Date.now() + 60000;
        req.session.email = email;

        res.status(200).json({ message: 'OTP sent to your email.' });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred. Please try again later.' });
    }
};

const resetPassword = async (req,res) =>{
    try {
        res.render('user/reset-password',{ pageTitle: "Reset Password" })
    } catch (error) {
       res.render('500'); 
    }
}

const resetPasswordPost = async (req, res) => {
    const { otp, newPassword} = req.body;
    const email = req.session.email;
    if (!otp) {
        return res.status(400).json({ message: 'OTP is required.' });
    }
    if (!newPassword) {
        return res.status(400).json({ message: 'New password is required.' });
    }
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    if (!req.session.otp || !req.session.otpExpiry) {
        return res.status(400).json({ message: 'OTP session expired. Please request a new OTP.' });
    }
    if (req.session.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP.' });
    }
    if (Date.now() > req.session.otpExpiry) {
        return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }

    // OTP is valid
    try {
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const hashedPassword = await securePassword(newPassword);
        if(!hashedPassword) {
            return res.render('500',{ errorMessage: "Password hashing has a problem" });
        }
        user.password = hashedPassword;
        await user.save();

        req.session.otp = null;
        req.session.otpExpiry = null;

        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred. Please try again later.' });
    }
};

const userLogout = (req, res) => {
    req.session.userId="";
    const adminId = req.session?.admin || "";
    if(req.session.userId=="" && adminId==""){
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send("Error logging out");
            }
        });
    }
    res.redirect("/login");
};


const filterProducts = async (req, res) => {
    try {
        const { page = 1, category, brands, sort, search } = req.body;
        const limit = 6;
        const skip = (page - 1) * limit;

        const featuredCategories = await categoryModel.find({ isFeatured: true }).select('_id');
        const featuredCategoryIds = featuredCategories.map(cat => cat._id);

        let query = { category: { $in: featuredCategoryIds } };
        query.isFeatured = true;
        if (category && category !== "all") {
            query.category = category;
        }

        if (brands && brands.length > 0) {
            query.brand = { $in: brands };
        }

        if (search && search.trim() !== '') {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } }
            ];
        }

        let sortOption = {};
        switch (sort) {
            case 'priceHighToLow':
                sortOption = { afterDiscount: -1 };
                break;
            case 'priceLowToHigh':
                sortOption = { afterDiscount: 1 };
                break;
            case 'nameAZ':
                sortOption = { productName: 1 };
                break;
            case 'nameZA':
                sortOption = { productName: -1 };
                break;
            default:
                sortOption = { createdAt: -1 }; // newArrivals
        }

        let products = await ProductModel.find(query)
            .collation({ locale: 'en', strength: 2 })
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
        const category = await CategoryModel.find({ isFeatured: true });
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
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const productDetails = async (req, res) => {
    try {
        const { productId } = req.params;

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
            isFeatured: true,
            _id: { $ne: product._id },
        });
        
        res.render("user/product-details", {
            product,
            category,
            relatedProducts,
            pageTitle: "Product Detailed Page"
        });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

module.exports = {
    googleAuth,
    googleAuthCallback,
    googleAuthFailure,
    home,
    login,
    loginPost,
    signup,
    signupPost,
    signupOtp,
    signupOtpPost,
    resendOtp,
    forgotPassword,
    forgotPasswordPost,
    resetPassword,
    resetPasswordPost,
    userLogout,
    userShop,
    filterProducts,
    productDetails
};
