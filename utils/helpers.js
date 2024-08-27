const bcrypt = require("bcryptjs");
const CouponModel = require("../model/coupon-model");
const UserModel = require("../model/user-model");
const CartModel = require("../model/cart-model");
const WishlistModel = require("../model/wishlist-model");

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

async function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function generateUniqueOrderID() {
    const randomPart = await getRandomNumber(100000, 999999);

    const currentDate = new Date();

    // Format the date as YYYYMMDD
    const datePart = currentDate.toISOString().slice(0, 10).replace(/-/g, "");

    // Combine the date and random number with "ID"
    const orderID = `ID_${randomPart}${datePart}`;

    return orderID;
}

async function updateExpiredCoupons() {
    try {
        const now = new Date();
        
        const result = await CouponModel.updateMany(
            { 
                $or: [
                    { expirationDate: { $lt: now }, isActive: true },
                    { maxUsers: { $eq: 0 }, isActive: true }
                ]
            },
            { 
                $set: { isActive: false },
                $currentDate: { lastUpdated: true }
            },
        );
        return result;
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

async function generateReferralCode(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let referralCode = '';
    let isUnique = false;

    while (!isUnique) {
        referralCode = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            referralCode += characters[randomIndex];
        }

        const existingUser = await UserModel.findOne({ referralCode });

        if (!existingUser) {
            isUnique = true;
        }
    }
    return referralCode;
}

const formatToIndianCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
    }).format(amount);
};

const cartWishlistCount = async (req,res) => {
    const userId = req.session.userId || null;
    let cartCount = 0;
    let wishlistCount = 0;
    if(!userId) {
        return res.json({ cartCount, wishlistCount })
    }
    const cart = await CartModel.findOne({owner:userId}) || null;
    const wishlist = await WishlistModel.findOne({user:userId}) || null;

    cart ? cartCount = cart.items.length : 0;
    wishlist ? wishlistCount = wishlist.products.length : 0;

    return res.json({ cartCount, wishlistCount })
}

const clearCart = async (userId) => {
    try {
        await CartModel.deleteOne({ owner: userId });
    } catch (error) {
        throw new Error("Error clearing the cart");
    }
};

module.exports = {
    securePassword,
    generateUniqueOrderID,
    updateExpiredCoupons,
    formatDate,
    generateReferralCode,
    formatToIndianCurrency,
    cartWishlistCount,
    clearCart
}