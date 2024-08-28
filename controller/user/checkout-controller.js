const mongoose = require("mongoose");
const UserModel = require("../../model/user-model");
const ProductModel = require("../../model/product-model");
const CategoryModel = require("../../model/category-model");
const CartModel = require("../../model/cart-model");
const AddressModel = require("../../model/address-model");
const OrderModel = require("../../model/order-model");
const CouponModel = require('../../model/coupon-model');
const WalletModel = require('../../model/wallet-model');
const { generateUniqueOrderID, updateExpiredCoupons, clearCart } = require('../../utils/helpers');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
	key_id: process.env.RAZORPAY_CLIENT_ID,
	key_secret: process.env.RAZORPAY_CLIENT_SECRET
});

const orderCheckout = async (req, res) => {
    try {
        const userId = req.session.userId;
        let addressList = await AddressModel.findOne({
            user: userId,
        });
        if (!addressList) {
            addressList = null;
        }
        await updateExpiredCoupons();
        const coupons = await CouponModel.find({isActive:true});
        const userDetails = await UserModel.findById(userId);
        const category = await CategoryModel.find();
        const cartCheckout = await CartModel.findOne({ owner: userId }).populate({ path: "items.productId", model: "Products" });
        if (!cartCheckout || cartCheckout.items.length === 0) {
            return res.status(404).render("404", { errorMessage: 'Cart not found or empty' });
        }

        const selectedItems = cartCheckout.items;

        const billTotal = selectedItems.reduce(
            (total, item) => total + item.price,
            0
        );

        const itemCount = selectedItems.length;

        if (req.session.orderData) {
            delete req.session.orderData;
        }

        res.render("user/checkout", {
            category,
            addressList,
            selectedItems,
            billTotal,
            itemCount,
            userDetails,
            coupons,
            err: "",
            pageTitle: "checkout",
        });
    } catch (err) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const orderCheckoutPost = async (req, res, next) => {
    try {
        const { paymentOption, addressId, couponCode } = req.body;
        if (!paymentOption || !addressId) {
            return res.status(400).json({ success: false, error: "Invalid data in the request" });
        }

        const cart = await CartModel.findOne({ owner: req.session.userId }).populate({ path: 'items.productId', model: 'Products' });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, error: "No items in the cart" });
        }

        // Check for non-featured products in the cart
        const nonFeaturedItems = cart.items.filter(item => !item.productId.isFeatured);
        
        if (nonFeaturedItems.length > 0) {
            // Remove non-featured items from the cart
            cart.items = cart.items.filter(item => item.productId.isFeatured);
            await cart.save();

            const nonFeaturedItemsList = nonFeaturedItems
                .map(item => `${item.productId.productName}`)

            return res.status(400).json({
                success: false, error: "blocked products",nonFeaturedItemsList,blockedProducts:true
            });
        }

        // Check for items in the cart that are out of stock (countInStock = 0)
        const outOfStockItems = cart.items.filter(item => item.productId.countInStock === 0);

        if (outOfStockItems.length > 0) {
            const outOfStockItemsList = outOfStockItems
                .map(item => `${item.productId.productName}`);

            // Remove out-of-stock items from the cart
            cart.items = cart.items.filter(item => item.productId.countInStock > 0);

            // Save the updated cart
            await cart.save();

            return res.status(400).json({
                success: false,
                error: "out of stock products",
                outOfStockItemsList,
                outOfStock: true
            });
        }

        // Check for items in the cart that exceed available stock
        const lowQuantityItems = cart.items.filter(item => item.productId.countInStock < item.quantity);

        if (lowQuantityItems.length > 0) {
            const lowQuantityItemsList = lowQuantityItems
                .map(item => `${item.productId.productName} (In cart: ${item.quantity}, Available: ${item.productId.countInStock})`);
            
            // Adjust quantities in the cart to match available stock
            lowQuantityItems.forEach(item => {
                const product = cart.items.find(cartItem => cartItem.productId._id.toString() === item.productId._id.toString());
                if (product) {
                    product.quantity = item.productId.countInStock;
                }
            });

            await cart.save();


            return res.status(400).json({
                success: false, 
                error: "low quantity products",
                lowQuantityItemsList,
                lowStock: true
            });
        }

        const address = await AddressModel.findOne({ user: req.session.userId });
        if (!address) {
            return res.status(400).json({ success: false, error: "User has no address" });
        }
        
        const deliveryAddress = address.addresses.find(addr => addr._id.toString() === addressId);
        if (!deliveryAddress) {
            return res.status(400).json({ success: false, error: "Address not found" });
        }

        const orderAddress = {
            addressType: deliveryAddress.addressType,
            houseNo: deliveryAddress.houseNo,
            street: deliveryAddress.street,
            landmark: deliveryAddress.landmark,
            pincode: deliveryAddress.pincode,
            city: deliveryAddress.city,
            district: deliveryAddress.district,
            state: deliveryAddress.state,
            country: deliveryAddress.country,
        };

        const order_id = await generateUniqueOrderID();
        let billTotal = cart.items.reduce((total, item) => {
            const price = item.productId.discountPrice > 0 ? item.productId.afterDiscount : item.productId.price;
            return total + (parseFloat(price) * parseInt(item.quantity));
        }, 0);

        const wallet = await WalletModel.findOne({ owner: req.session.userId });
        if (paymentOption === "Wallet") {
            if (wallet.balance < billTotal) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient balance in wallet",
                    balance: wallet.balance
                });
            }
        }

        // Apply coupon if provided
        let couponDiscount = 0;
        let appliedCouponCode = null;
        if (couponCode) {
            await updateExpiredCoupons();
            let appliedCoupon = await CouponModel.findOne({ couponCode: couponCode });
            if (appliedCoupon && 
                appliedCoupon.isActive && 
                !appliedCoupon.isDeleted &&
                billTotal >= appliedCoupon.minimumAmount &&
                billTotal <= appliedCoupon.maximumAmount) {
                
                couponDiscount = appliedCoupon.discountAmount;
                billTotal -= couponDiscount;
                appliedCouponCode = couponCode;

            } else {
                return res.status(400).json({ success: false, error: "Invalid or expired coupon" });
            }
        }
        
        if (billTotal > 500000) {
            return res.status(400).json({ success: false, error: "Total bill exceeds the allowed limit of 500,000 rupees" });
        }

        if (paymentOption === "COD" && billTotal > 75000) {
            return res.status(400).json({ success: false, error: "Total bill exceeds the allowed limit of 75,000 rupees for Cash on Delivery" });
        }

        let paymentStatus = paymentOption === "COD" ? "Pending" : "Success";

        if (paymentOption === "Razorpay") {
            paymentStatus = "Pending"; // Set status to pending until payment is confirmed
        }

        if (paymentOption === "COD" || paymentOption === "Wallet") {
            const { error, orderId } = await createOrder(cart, orderAddress, order_id, billTotal, paymentOption, req.session.userId, paymentStatus, couponDiscount, appliedCouponCode);

            if (error) {
                return res.status(400).json({ success: false, error });
            }

            if (paymentOption === "Wallet") {
                wallet.balance -= billTotal;
                wallet.transactions.push({ 
                    amount: billTotal, 
                    type: "debit",
                    reason: `Purchase for orderId: ${order_id}`
                });
                await wallet.save();
            }

            await clearCart(req.session.userId);

            return res.status(201).json({
                success: true,
                message: "Order placed successfully",
                orderId,
            });
        } else if (paymentOption === "Razorpay") {
            const options = {
                amount: billTotal * 100, // smallest currency amount
                currency: 'INR',
                receipt: order_id
            };
            razorpay.orders.create(options, async (err, razorpayOrder) => {
                if (!err) {
                    const razorpayOrderId = razorpayOrder.id;
                    // Save order details in session
                    req.session.orderData = {
                        cart,
                        orderAddress,
                        order_id,
                        razorpayOrderId,
                        billTotal,
                        couponDiscount,
                        appliedCouponCode,
                        paymentOption,
                        userId: req.session.userId,
                    };

                    return res.status(201).json({
                        success: true,
                        message: "Order initiated, complete the payment",
                        razorpayOrderId,
                        amount: razorpayOrder.amount,
                        currency: razorpayOrder.currency,
                    });
                } else {
                    return res.status(400).json({
                        success: false,
                        message: "Error in Razorpay!",
                        error: err.message, 
                    });
                }
            });
        } else {
            return res.status(400).json({ success: false, error: "Invalid payment option" });
        }
    } catch (err) {
        next(err);
    }
};

const createOrder = async (cart, orderAddress, order_id, billTotal, paymentOption, userId, paymentStatus, couponDiscount = 0,appliedCoupon = null) => {
    try {
        // Calculate total MRP of all products
        const totalAmount = cart.items.reduce((total, item) => {
            return total + Math.floor(parseFloat(item.productId.price) * parseInt(item.quantity));
        }, 0);

        // Calculate total offer price of all products
        const offerPrice = cart.items.reduce((total, item) => {
            return total + Math.floor(parseFloat(item.productId.afterDiscount) * parseInt(item.quantity));
        }, 0);

        // Calculate offerDiscount
        const offerDiscount = totalAmount - offerPrice;

        // Prepare order data
        const orderData = {
            user: userId,
            items: [],
            oId: order_id,
            paymentStatus,
            paymentMethod: paymentOption,
            deliveryAddress: orderAddress,
            billTotal,
            totalAmount,
            offerDiscount,
            couponDiscount,
            status: paymentStatus !== "Failed" ? "Processing" : "Pending",
        };

        // Populate items in the order
        for (const item of cart.items) {
            const product = await ProductModel.findOne({ _id: item.productId });

            if (product) {
                if (product.countInStock >= item.quantity) {
                    orderData.items.push({
                        productId: item.productId._id,
                        image: item.productId.image,
                        productName: item.productId.productName,
                        productPrice: item.productId.afterDiscount,
                        productMRP: item.productId.price,
                        quantity: item.quantity,
                        totalPrice: Math.floor(parseFloat(item.productId.afterDiscount) * parseInt(item.quantity)),
                        totalMRP: Math.floor(parseFloat(item.productId.price) * parseInt(item.quantity)),
                    });
                } else {
                    throw new Error("Not enough stock for some items");
                }
            } else {
                throw new Error("Product not found");
            }
        }

        // Reduce stock based on payment method and status
        if (
            (paymentOption === "Wallet" && paymentStatus === "Success") ||
            (paymentOption === "COD" && paymentStatus === "Pending") ||
            (paymentOption === "Razorpay" && (paymentStatus === "Success" || paymentStatus === "Failed"))
        ) {
            for (const item of cart.items) {
                const product = await ProductModel.findOne({ _id: item.productId });

                if (product) {
                    product.countInStock -= item.quantity;
                    await product.save();
                }
            }
        }

        // Save order in the database
        const order = new OrderModel(orderData);
        await order.save();

        // Update maxUsers in the coupon if applied
        if (appliedCoupon) {
            coupon = await CouponModel.findOne({ couponCode: appliedCoupon });
            if (coupon.maxUsers !== null) {
                coupon.maxUsers--;
                if (coupon.maxUsers <= 0) {
                    coupon.isActive = false;
                }
                await coupon.save();
            }
        }

        return { error: null, orderId: order._id };
    } catch (error) {
        return { error: error.message, orderId: null };
    }
};

const handlePaymentSuccess = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Verify Razorpay signature
        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_CLIENT_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const digest = shasum.digest('hex');

        if (digest !== razorpay_signature) {
            return res.status(400).json({ success: false, error: "Transaction not legit!" });
        }

        // Check if the order details are stored in the session
        if (!req.session.orderData) {
            return res.status(400).json({ success: false, error: "No order data found in session" });
        }

        const { cart, orderAddress, billTotal, paymentOption, userId, razorpayOrderId, couponDiscount, appliedCouponCode } = req.session.orderData;
        const order_id = await generateUniqueOrderID();

        // Create the order
        const { error, orderId } = await createOrder(cart, orderAddress, order_id, billTotal, paymentOption, userId, "Success", couponDiscount, appliedCouponCode);

        if (error) {
            return res.status(400).json({ success: false, error });
        }

        await OrderModel.findByIdAndUpdate(orderId,{ razorpayOrderId: razorpayOrderId })

        // Clear the session order data
        if (req.session.orderData) {
            delete req.session.orderData;
        }

        await clearCart(userId);

        return res.status(200).json({ success: true, message: "Payment successful, order created", orderId });
    } catch (err) {
        next(err);
    }
};

const handlePaymentFailure = async (req, res, next) => {
    try {
        const { razorpay_order_id } = req.body;

        // Check if the order details are stored in the session
        if (!req.session.orderData) {
            return res.status(400).json({ success: false, error: "No order data found in session" });
        }

        const { cart, orderAddress, billTotal, paymentOption, userId, razorpayOrderId, couponDiscount, appliedCouponCode } = req.session.orderData;
        const order_id = await generateUniqueOrderID();

        // Create the order with payment status as "Failed"
        const { error, orderId } = await createOrder(cart, orderAddress, order_id, billTotal, paymentOption, userId, "Failed", couponDiscount, appliedCouponCode);

        if (error) {
            return res.status(400).json({ success: false, error });
        }

        await OrderModel.findByIdAndUpdate(orderId,{ razorpayOrderId: razorpayOrderId })

        // Clear the session order data
        if (req.session.orderData) {
            delete req.session.orderData;
        }

        await clearCart(userId);

        return res.status(200).json({ success: true, message: "Payment failed, order recorded", orderId });
    } catch (err) {
        next(err);
    }
};

const orderConfirmGet = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        res.render("user/order-confirmed", { orderId })
    } catch (error) {
        errorMessage
        res.render("500", { errorMessage: 'Internal server error' })
    }
}

const orderDetailsGet = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { orderId } = req.params;

        let orderDetails = await OrderModel.findById(orderId);

        if (orderDetails) {
            const userDetails = await UserModel.findById(userId)
            const userName = userDetails.fullname;
            res.render('user/order-details', { orderDetails, userName, pageTitle: "Order Page" });

        } else {
            res.send("no orders available in this id");
        }
    } catch (err) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
}

const retryPayment = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await OrderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const razorpayOrder = await razorpay.orders.create({
            amount: order.billTotal * 100, // Amount in paise
            currency: 'INR',
            receipt: order.oId,
            payment_capture: 1
        });

        res.json({
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            oId: order.oId
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create new payment order' });
    }
};

const successRetryPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

            const order = await OrderModel.findById(orderId);

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            order.paymentStatus = "Success";
            order.status = "Processing";
            order.razorpayOrderId = razorpay_order_id;

            await order.save();

            res.status(200).json({ message: 'Payment successful and order updated', orderId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process successful payment' });
    }
};

const cancelOrder = async (req, res) => {
    const { orderId, reason } = req.body;

    if (!orderId || !reason) {
        return res.status(400).json({ message: 'Order ID and reason are required' });
    }

    try {
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.requests.push({
            type: 'Cancel',
            status: 'Accepted',
            reason: reason,
        });

        order.status = 'Cancelled';

        for (const item of order.items) {
            await ProductModel.findByIdAndUpdate(
                item.productId,
                { $inc: { countInStock: item.quantity } },
                { new: true }
            );
        }

        if(order.paymentMethod === "Razorpay" || order.paymentMethod === "Wallet") {
            const wallet = await WalletModel.findOne({owner:order.user});
            wallet.balance += order.billTotal;
            wallet.transactions.push({ 
                amount: order.billTotal, 
                type: "credit", 
                reason: `Refund of cancellation of orderId: ${order.oId}`
            });
            await wallet.save();
        }

        await order.save();

        res.status(200).json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const returnOrder = async (req, res) => {
    const { orderId, reason } = req.body;

    if (!orderId || !reason) {
        return res.status(400).json({ message: 'Order ID and reason are required' });
    }

    try {
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.requests.push({
            type: 'Return',
            status: 'Accepted',
            reason: reason,
        });

        order.status = 'Returned';
        for (const item of order.items) {
            await ProductModel.findByIdAndUpdate(
                item.productId,
                { $inc: { countInStock: item.quantity } },
                { new: true }
            );
        }

        await order.save();

        const wallet = await WalletModel.findOne({owner:order.user});
        wallet.balance += order.billTotal;
        wallet.transactions.push({ 
            amount: order.billTotal, 
            type: "credit", 
            reason: `Refund from returning of orderId: ${order.oId}`
        });
        await wallet.save();
        
        res.status(200).json({ message: 'Order returned successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const availableCoupons = async (req, res) => {
    try {
        const cartTotal = parseFloat(req.query.cartTotal);

        if (isNaN(cartTotal)) {
            return res.status(400).json({ message: 'Invalid cart total' });
        }
        await updateExpiredCoupons();
        const coupons = await CouponModel.find({
            isActive: true,
            isDeleted: false,
            minimumAmount: { $lte: cartTotal },
            maximumAmount: { $gte: cartTotal }
        }).select('couponCode description discountAmount minimumAmount maximumAmount expirationDate').lean();

        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch available coupons' });
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.session.userId;
        const cart = await CartModel.findOne({ owner: userId });
        let cartTotal = cart.billTotal;
        await updateExpiredCoupons();
        const coupon = await CouponModel.findOne({ 
            couponCode: code, 
            isActive: true, 
            isDeleted: false,
        });

        if (!coupon) {
            return res.json({ success: false, message: 'Invalid or expired coupon' });
        }

        if (cartTotal < coupon.minimumAmount) {
            return res.json({ success: false, message: `Minimum purchase amount of ₹${coupon.minimumAmount} required` });
        }

        if (cartTotal > coupon.maximumAmount) {
            return res.json({ success: false, message: `Maximum purchase amount is ₹${coupon.maximumAmount}` });
        }

        const discountedTotal = cartTotal - coupon.discountAmount;

        // Store the applied coupon and new total in the session
        req.session.appliedCoupon = coupon;
        req.session.cartTotal = discountedTotal;

        res.json({ success: true, message: 'Coupon applied successfully', newTotal: discountedTotal, discountAmount: coupon.discountAmount });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to apply coupon' });
    }
};

const removeCoupon = async (req, res) => {
    try {
        const appliedCoupon = req.session.appliedCoupon;
        if (!appliedCoupon) {
            return res.json({ success: false, message: 'No coupon applied' });
        }

        let cartTotal = req.session.cartTotal || 0;

        const originalTotal = cartTotal + appliedCoupon.discountAmount;

        // Remove the applied coupon from the session
        delete req.session.appliedCoupon;
        req.session.cartTotal = originalTotal;

        res.json({ success: true, message: 'Coupon removed successfully', newTotal: originalTotal });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to remove coupon' });
    }
};

module.exports = {
    orderCheckout,
    orderCheckoutPost,
    orderConfirmGet,
    handlePaymentSuccess,
    handlePaymentFailure,
    orderDetailsGet,
    retryPayment,
    successRetryPayment,
    cancelOrder,
    returnOrder,
    availableCoupons,
    applyCoupon,
    removeCoupon,
};
