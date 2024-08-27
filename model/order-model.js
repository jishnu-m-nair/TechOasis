const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectID = mongoose.Schema.Types.ObjectId;

const orderSchema = new Schema(
    {
        user: {
            type: ObjectID,
            ref: "users",
            required: true,
        },
        oId: {
            type: String,
            required: true,
        },

        items: [
            {
                productId: {
                    type: ObjectID,
                    ref: "products",
                    required: true,
                },
                image: {
                    type: String,
                    required: true,
                },
                productName: {
                    type: String,
                    required: true,
                },
                productPrice: {
                    type: Number,
                    required: true,
                },
                productMRP: {
                    type: Number,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: [1, "Quantity can not be less than 1."],
                    default: 1,
                },
                totalPrice: {
                    type: Number,
                    required: true,
                },
                totalMRP: {
                    type: Number,
                },
            },
        ],
        billTotal: {
            type: Number,
            required: true,
        },
        totalAmount: {
            type: Number,
        },
        paymentMethod: {
            type: String,
            enum: ["Razorpay","COD","Wallet"]
        },
        paymentStatus: {
            type: String,
            enum: ["Pending", "Success", "Failed"],
            default: "Pending",
        },
        deliveryAddress: {
            type: {
                addressType: String,
                houseNo: String,
                street: String,
                landmark: String,
                pincode: Number,
                city: String,
                district: String,
                state: String,
                country: String,
            },
            required: true,
        },
        orderDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled","Returned"],
            default: "Pending",
        },

        requests: [
            {
                type: {
                    type: String,
                    enum: ["Cancel","Return"],
                },
                status: {
                    type: String,
                    enum: ["Pending", "Accepted", "Rejected"],
                    default: "Pending",
                },
                reason: {
                    type: String,
                },
            },
        ],
        offerDiscount: {
            type: Number,
            default: 0,
        },
        couponDiscount: {
            type: Number,
            default: 0,
        },
        razorpayOrderId:{
            type: String
        }
    },
    {
        timestamps: true,
    }
);

const OrderModel = mongoose.model("orders", orderSchema);

module.exports = OrderModel;
