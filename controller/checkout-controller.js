const mongoose = require("mongoose");
const UserModel = require("../model/user-model");
const ProductModel = require("../model/product-model");
const CategoryModel = require("../model/category-model");
const CartModel = require("../model/cart-model");
const AddressModel = require("../model/address-model");
const OrderModel = require("../model/order-model");
// const crypto = require("crypto");

async function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// Function to generate a unique order ID
async function generateUniqueOrderID() {
    // Generate a random 6-digit number
    const randomPart = await getRandomNumber(100000, 999999);

    // Get the current date
    const currentDate = new Date();

    // Format the date as YYYYMMDD
    const datePart = currentDate.toISOString().slice(0, 10).replace(/-/g, "");

    // Combine the date and random number with "ID"
    const orderID = `ID_${randomPart}${datePart}`;

    return orderID;
}

const orderCheckout = async (req, res) => {
    try {
        let UserExist = req.session.userId ? true : false;
        const addressList = await AddressModel.findOne({
            user: req.session.userId,
        });
        const userDetails = await UserModel.findOne({
            _id: req.session.userId,
        });
        const category = await CategoryModel.find();
        const cartCheckout = await CartModel.findOne({owner: req.session.userId}).populate({ path: "items.productId", model: "Products" });

        const selectedItems = cartCheckout.items;
        let selectedAddressTypes = []; // Initialize selectedAddressTypes as an empty array

        // Calculate the total amount for the order
        const billTotal = selectedItems.reduce(
            (total, item) => total + item.price,
            0
        );
        // Get the count of selected items
        const itemCount = selectedItems.length;

        let flag = 0;
        Promise.all(
            selectedItems.map(async (item, index) => {
                let stock = await ProductModel.findById(item.productId);
                console.log(
                    "Quantity",
                    item.quantity,
                    "Stock",
                    stock.countInStock
                );
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
                    //save
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
                    selectedAddressTypes,
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
                    selectedAddressTypes,
                    userDetails,
                    err: "",
                    pageTitle: "checkout",
                });
            }
        });
    } catch (err) {
        console.log(err);
    }
};

let orderCheckoutPost = async (req, res, next) => {
    try {
        console.log("reachesd")
        if (!req.body.paymentOption || !req.body.addressId) {
            // Handle invalid or missing data in the request
            return res
                .status(400)
                .json({ success: false, error: "Invalid data in the request",id:req.body.addressId });
        }
        const {paymentOption, addressId} = req.body;

        const cart = await CartModel.findOne({ owner: req.session.userId }).populate({path:'items.productId',model:'Products'});

        if (!cart || cart.items.length === 0) {
            // Handle the case where the user has no items in the cart
            console.log("no cart");
            return res
                .status(400)
                .json({ success: false, error: "No items in the cart" });
        }

        const address = await AddressModel.findOne({
            user: req.session.userId,
        });

        if (!address) {
            // Handle the case where the user has no address
            console.log("no address");
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
        // console.log(req.body.paymentOption)
        if (req.body.paymentOption === "COD") {

            const order_id = await generateUniqueOrderID();
            // Create a new order
            const orderData = {
                user: req.session.userId,
                items: [],
                oId: order_id,
                paymentStatus: "Pending",
                paymentMethod: req.body.paymentOption,
                deliveryAddress: orderAddress,
            };
            // console.log("selected items-------------",selectedItems)
            // console.log("orderData Before---------------",orderData)
            for (const item of selectedItems) {
                orderData.items.push({
                    productId: item.productId._id,
                    image: item.productId.image,
                    productName: item.productId.productName,
                    productPrice: item.productId.price,
                    quantity: item.quantity,
                    totalPrice: Math.floor(parseFloat(item.productId.price) * parseInt(item.quantity))
                })
            }
            
            console.log("before======================",orderData);
            for (const item of selectedItems) {
                const product = await ProductModel.findOne({
                    _id: item.productId,
                });


                if (product) {
                    // Ensure that the requested quantity is available in stock
                    if (product.countInStock >= item.quantity) {
                        // Decrease the countInStock by the purchased quantity
                        product.countInStock -= item.quantity;
                        console.log(product.countInStock);
                        await product.save();
                    } else {
                        // Handle the case where the requested quantity is not available
                        return res.status(400).json({
                            success: false,
                            error: "Not enough stock for some items",
                        });
                    }
                } else {
                    // Handle the case where the product was not found
                    return res
                        .status(400)
                        .json({ success: false, error: "Product not found" });
                }
            }
            
            let billTotal = selectedItems.reduce(
                (total, item) => total + item.price,
                0
            );
            orderData.billTotal = billTotal;
            console.log(orderData);
            const order = new OrderModel(orderData);
            await order.save();
            console.log("Order Sucess");
            

            // // Update payment status based on order status
            // if (order.status === "Delivered") {
            //     order.paymentStatus = "Success";
            //     await order.save();
            // }

            // Remove selected items from the cart
            try {
                result = await CartModel.deleteOne({ owner: req.session.userId })
                console.log("cart is cleared");
            } catch (error) {
                console.log("error in cart clear"+error);
            }

            // // Get the order ID after saving it
            const orderId = order._id;

            return res.status(201).json({
                success: true,
                message: "order placed successfully",
                orderId,
                // order,
            }); // Redirect to a confirmation page
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

const orderConfirmGet = async (req,res) =>{
    const orderId = req.params.orderId;
    const orderDetails = await OrderModel.findById(orderId)
    const userDetails = await UserModel.findById(req.session.userId)
    console.log(userDetails.fullname)
    const userName = userDetails.fullname;
    res.render("user/order",{orderDetails,userName,pageTitle:"Order Confirmation"})
}

const orderDetailsGet = async (req,res) => {
    try {
        const userId = req.session.userId;
        const { orderId } = req.params;

        let orderDetails = await OrderModel.findById(orderId);

        if (orderDetails) {
            res.render('user/order-details',{orderDetails, pageTitle: "Order Page"});
            
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
    orderDetailsGet,
    cancelOrderRequest
};
