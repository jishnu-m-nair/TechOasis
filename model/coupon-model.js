const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        unique: true,
        required: true,
        uppercase: true
    },
    description: {
        type: String,

    },
    discountAmount: {
        type: Number,
        required: true,
        min: 0,
        max: 5000,

    },
    minimumAmount: {
        type: Number,
        required: true,
        default: 30000
    },
    maximumAmount: {
        type: Number,
        required: true,
    },
    expirationDate: {
        type: Date,
        required: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    maxUsers: {
        type: Number,
        default: null,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true
    }


}, {
    timestamps: true
});

const CouponModel = mongoose.model('coupon', couponSchema);


module.exports = CouponModel;

