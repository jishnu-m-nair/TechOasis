const CouponModel = require('../../model/coupon-model');
const { updateExpiredCoupons } = require('../../utils/helpers');

const couponManagement = async (req,res) => {
    try {
        await updateExpiredCoupons();
        const coupons = await CouponModel.find({isDeleted:false}) || null;
        res.render("admin/coupon",{page:"coupon-management",pagetitle:"coupon page",coupons})
    } catch (error) {
        console.log("error",error);
    }
}

const addCoupon = async (req, res) => {
    console.log("heyyy")
    try {
        const { couponCode, description, discountAmount, minimumAmount, maximumAmount, expirationDate, maxUsers } = req.body;
        const newCoupon = new CouponModel({
            couponCode,
            description,
            discountAmount: Number(discountAmount),
            minimumAmount: Number(minimumAmount),
            maximumAmount: Number(maximumAmount),
            expirationDate: new Date(expirationDate),
            maxUsers: maxUsers ? Number(maxUsers) : null,
            isActive: true
        });
        await newCoupon.save();
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred while adding the coupon' });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await CouponModel.findByIdAndUpdate(id,{ isActive: false, isDeleted:true });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the coupon' });
    }
};

module.exports = {
    couponManagement,
    addCoupon,
    deleteCoupon
}