const mongoose = require("mongoose");
const UserModel = require("../../model/user-model");
const ProductModel = require("../../model/product-model");
const CategoryModel = require("../../model/category-model");
const CartModel = require("../../model/cart-model");
const AddressModel = require("../../model/address-model");
const OrderModel = require("../../model/order-model");
const { generateUniqueOrderID } = require('../../utils/helpers');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
	key_id: process.env.RAZORPAY_CLIENT_ID,
	key_secret: process.env.RAZORPAY_CLIENT_SECRET
});

const orderCheckout = async (req, res) => {
    try {
        let UserExist = req.session.userId ? true : false;

        let addressList = await AddressModel.findOne({
            user: req.session.userId,
        });
        if (!addressList) {
            addressList = null;
        }
        const userDetails = await UserModel.findOne({
            _id: req.session.userId,
        });
        const category = await CategoryModel.find();
        const cartCheckout = await CartModel.findOne({ owner: req.session.userId }).populate({ path: "items.productId", model: "Products" });
        if (!cartCheckout || cartCheckout.items.length === 0) {
            return res.status(404).render("404", { errorMessage: 'Cart not found or empty' });
        }

        const selectedItems = cartCheckout.items;

        const billTotal = selectedItems.reduce(
            (total, item) => total + item.price,
            0
        );

        const itemCount = selectedItems.length;

        let flag = 0;
        Promise.all(
            selectedItems.map(async (item, index) => {
                let stock = await ProductModel.findById(item.productId);
                if (item.quantity > stock.countInStock) {
                    flag = 1;
                    selectedItems[index].quantity = stock.countInStock;
                    //under database
                    cartCheckout.items.map(async (prod, i) => {
                        if (
                            prod.productId + "" ===
                            selectedItems[index].productId + ""
                        ) {
                            cartCheckout.items[i].quantity = stock.countInStock;
                            console.log("before saving    ==");
                            await cartCheckout.save();
                        }
                    });
                }
            })
        ).then(() => {
            if (flag === 1) {
                flag = 0;

                res.render("user/checkout", {
                    UserExist: UserExist,
                    category,
                    addressList,
                    selectedItems,
                    billTotal,
                    itemCount,
                    userDetails,
                    err: true,
                    pageTitle: "checkout",
                });
            } else {
                res.render("user/checkout", {
                    UserExist: UserExist,
                    category,
                    addressList,
                    selectedItems,
                    billTotal,
                    itemCount,
                    userDetails,
                    err: "",
                    pageTitle: "checkout",
                });
            }
        });
    } catch (err) {
        console.log("catch block");
        console.log(err);
    }
};

const orderCheckoutPost = async (req, res, next) => {
    try {
        const { paymentOption, addressId } = req.body;
        if (!paymentOption || !addressId) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid data in the request" });
        }

        const cart = await CartModel.findOne({ owner: req.session.userId }).populate({ path: 'items.productId', model: 'Products' });

        if (!cart || cart.items.length === 0) {
            return res
                .status(400)
                .json({ success: false, error: "No items in the cart" });
        }

        const address = await AddressModel.findOne({
            user: req.session.userId,
        });

        if (!address) {
            return res
                .status(400)
                .json({ success: false, error: "User has no address" });
        }
        const deliveryAddress = address.addresses.find(addr => addr._id.toString() === addressId);
        if (!deliveryAddress) {
            return res
                .status(400)
                .json({ success: false, error: "Address not found" });
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

        const selectedItems = cart.items;
        const order_id = await generateUniqueOrderID();
        let billTotal = selectedItems.reduce((total, item) => total + (parseFloat(item.productId.afterDiscount) * parseInt(item.quantity)), 0);

        if (billTotal > 500000) {
            return res.status(400).json({ success: false, error: "Total bill exceeds the allowed limit of 500,000 rupees" });
        }

        if (paymentOption === "COD" && billTotal > 75000) {
            return res.status(400).json({ success: false, error: "Total bill exceeds the allowed limit of 75,000 rupees for Cash on Delivery" });
        }
        const orderData = {
            user: req.session.userId,
            items: [],
            oId: order_id,
            paymentStatus: "Pending",
            paymentMethod: paymentOption,
            deliveryAddress: orderAddress,
            billTotal: billTotal
        };
        for (const item of selectedItems) {
            orderData.items.push({
                productId: item.productId._id,
                image: item.productId.image,
                productName: item.productId.productName,
                productPrice: item.productId.afterDiscount,
                quantity: item.quantity,
                totalPrice: Math.floor(parseFloat(item.productId.afterDiscount) * parseInt(item.quantity))
            })
        }
        for (const item of selectedItems) {
            const product = await ProductModel.findOne({ _id: item.productId });

            if (product) {
                if (product.countInStock >= item.quantity) {
                    product.countInStock -= item.quantity;
                    await product.save();
                } else {
                    return res.status(400).json({ success: false, error: "Not enough stock for some items" });
                }
            } else {
                return res.status(400).json({ success: false, error: "Product not found" });
            }
        }

        const order = new OrderModel(orderData);
        await order.save();

        // Empty the cart
        try {
            await CartModel.deleteOne({ owner: req.session.userId });
        } catch (error) {
            console.log("error in cart clear" + error);
        }

        if (paymentOption === "COD") {
            const orderId = order._id;

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

                    order.razorpayOrderId = razorpayOrder.id;
                    await order.save();

                    return res.status(201).json({
                        success: true,
                        message: "Order placed successfully.",
                        orderId: order._id,
                        razorpayOrderId: razorpayOrder.id,
                        amount: razorpayOrder.amount,
                        currency: razorpayOrder.currency,
                    });
                } else {
                    console.error("Error creating Razorpay order:", err);
                    res.status(400).json({
                        success: false,
                        message: "Error in razorpay!",
                        error: err.message, 
                    });
                }
            });
        } else {
            return res
                .status(400)
                .json({ success: false, error: "Invalid payment option" });
        }
    } catch (err) {
        console.error(err);
        next(err);
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

        // Find the order
        const order = await OrderModel.findOne({ razorpayOrderId: razorpay_order_id });
        if (!order) {
            return res.status(400).json({ success: false, error: "Order not found" });
        }

        // Update order status
        order.paymentStatus = "Success";
        await order.save();

        // // Update product stock
        // for (const item of order.items) {
        //     const product = await ProductModel.findById(item.productId);
        //     if (product) {
        //         product.countInStock -= item.quantity;
        //         await product.save();
        //     }
        // }

        // Clear the cart
        // await CartModel.deleteOne({ owner: order.user });

        return res.status(200).json({ success: true, message: "Payment successful", orderId: order._id });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

const handlePaymentFailure = async (req, res, next) => {
    try {
        const { razorpay_order_id } = req.body;
        const order = await OrderModel.findOne({ razorpayOrderId: razorpay_order_id });
        if (!order) {
            return res.status(400).json({ success: false, error: "Order not found" });
        }

        order.paymentStatus = "Failed";
        await order.save();
        console.log("orderod",order._id);
        return res.status(200).json({ success: true, message: "Payment failure recorded", orderId: order._id });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

const orderConfirmGet = async (req, res) => {
    const orderId = req.params.orderId;
    const orderDetails = await OrderModel.findById(orderId)
    const userDetails = await UserModel.findById(req.session.userId)
    console.log(userDetails.fullname)
    const userName = userDetails.fullname;
    res.render("user/order", { orderDetails, userName, pageTitle: "Order Confirmation" })
}

const orderDetailsGet = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { orderId } = req.params;

        let orderDetails = await OrderModel.findById(orderId);

        if (orderDetails) {
            res.render('user/order-details', { orderDetails, pageTitle: "Order Page" });

        } else {
            res.send("no orders available in this id");
        }
    } catch (err) {
        console.log('Error displaying orders:', err.message);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const cancelOrderRequest = async (req, res) => {
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
            status: 'Pending',
            reason: reason,
        });

        await order.save();

        res.status(200).json({ message: 'Cancellation request submitted successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


module.exports = {
    orderCheckout,
    orderCheckoutPost,
    orderConfirmGet,
    handlePaymentSuccess,
    handlePaymentFailure,
    orderDetailsGet,
    cancelOrderRequest,
};
