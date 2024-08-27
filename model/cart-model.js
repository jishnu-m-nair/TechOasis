const mongoose = require("mongoose");
const ObjectID = mongoose.Schema.Types.ObjectId;

const cartSchema = new mongoose.Schema(
    {
        owner: {
            type: ObjectID,
            required: true,
            ref: "users",
        },

        items: [
            {
                productId: {
                    type: ObjectID,
                    ref: "products",
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: [0, "Quantity can not be less then 1."],
                    default: 1,
                },
                price: {
                    type: Number,
                },
            },
        ],

        billTotal: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const CartModel = mongoose.model("Cart", cartSchema);

module.exports = CartModel;