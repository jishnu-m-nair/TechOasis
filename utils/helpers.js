const bcrypt = require("bcryptjs");
const CouponModel = require("../model/coupon-model");
const UserModel = require("../model/user-model");

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
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
        console.error('Error updating coupon statuses:', error);
        throw new Error('Could not update coupon statuses');
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

module.exports = {
    securePassword,
    generateUniqueOrderID,
    updateExpiredCoupons,
    formatDate,
    generateReferralCode
}