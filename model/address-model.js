const mongoose = require("mongoose");
const ObjectID = mongoose.Schema.Types.ObjectId;

const addressSchema = new mongoose.Schema({
    user: {
        type: ObjectID,
        ref: "User",
        required: true,
    },
    addresses: [
        {
            addressType: {
                type: String,
                required: true,
                enum: ["home", "work"], // Define the allowed values for address type
            },
            houseNo: {
                type: String,
                required: true,
            },
            street: {
                type: String,
            },
            landmark: {
                type: String,
            },
            pincode: {
                type: Number,
                required: true,
            },
            city: {
                type: String,
                required: true,
            },
            district: {
                type: String,
                required: true,
            },
            state: {
                type: String,
                required: true,
            },
            country: {
                type: String,
                required: true,
            },
        },
    ],
});

const AddressModel = mongoose.model("Address", addressSchema);
module.exports = AddressModel;
