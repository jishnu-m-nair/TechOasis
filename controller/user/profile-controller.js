const mongoose = require("mongoose");
const UserModel = require("../../model/user-model");
const ProductModel = require("../../model/product-model");
const CategoryModel = require("../../model/category-model");
const AddressModel = require("../../model/address-model");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const { sentOtp } = require("../../config/nodeMailer");
const { isBlockedUser } = require("../../middlewares/auth");

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10); // Add await here
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
};

// Profile
const profile = async(req,res)=>{
    try {
      const userId = req.session.userId;
      const userinfo = await UserModel.findById(userId);
      // const addresses = await AddressModel.findOne({user:userId})
      // Fetch addresses for the user
      const addressDocument = await AddressModel.findOne({ user: userId });
  
      // Extract the nested addresses array
      const addresses = addressDocument ? addressDocument.addresses : [];
      res.render('user/profile',{userinfo,addresses,userId});
    } catch (error) {
      console.log(error);
    }
  };

// Edit Profile
const editProfile = async (req, res) => {
    try {
        const userId = req.session.userId;
        const userinfo = await UserModel.findById(userId);
        res.render("user/edit-profile", { userinfo });
    } catch (error) {
        console.log(error);
    }
};

const editProfilePatch = async (req, res) => {
    const { fullname, phone } = req.body;
    const userId = req.session.userId; // Assume user ID is available from authentication middleware

    try {
        // Find the user and update their info
        const user = await UserModel.findByIdAndUpdate(
            userId,
            { fullname, phone },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            redirectUrl: "/profile",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Change Password
const changePassword = async (req, res) => {
    try {
        const userId = req.session.userId;
        res.render("user/change-password", { userId });
    } catch (error) {
        console.error(error);
    }
};

const changePasswordPost = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Check if all fields are provided
    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }

    if (newPassword !== confirmPassword) {
        return res
            .status(400)
            .json({
                message: "New password and confirm password do not match.",
            });
    }

    if (newPassword.length < 8) {
        return res
            .status(400)
            .json({
                message: "New password must be at least 8 characters long.",
            });
    }

    try {
        const userId = req.session.userId;
        const userData = await UserModel.findOne({ _id: userId });
        if (!userData) {
            return res.status(404).json({ message: "User not found." });
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            currentPassword,
            userData.password
        );
        if (!isCurrentPasswordValid) {
            return res
                .status(400)
                .json({ message: "Current password is incorrect." });
        }
        let newPasswordHash = await securePassword(newPassword);

        const updatedUser = await UserModel.findOneAndUpdate(
            { _id: userData._id }, // Use the actual user ID field for update
            { password: newPasswordHash },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res
                .status(500)
                .json({
                    message: "An error occurred while updating the password. 1",
                });
        }

        // Respond with a success message
        return res
            .status(200)
            .json({
                message: "User password updated",
                redirectUrl: "/profile",
            });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({
                message: "An error occurred while changing the password.",
            });
    }
};

// Add Address
const addAddress = (req, res) => {
    try {
        const userId = req.session.userId;
        res.render("user/add-address", { userId });
    } catch (error) {
        console.error(error);
        res.status(500).json("Internal Server Error");
    }
};

const addAddressPost = async (req, res) => {
    try {
        const { userId, addressType, houseNo, street, landmark, pincode, city, district, state, country } = req.body;

        // Fetch the user's existing addresses
        let addressRecord = await AddressModel.findOne({ user: userId });

        if (!addressRecord) {
            // If no address record exists, create a new one
            addressRecord = new AddressModel({ user: userId, addresses: [] });
        }

        if (addressRecord.addresses.length >= 3) {
            return res.status(400).json({ message: 'You can only have up to 3 addresses.' });
        }

        // Add the new address
        const newAddress = {
            addressType,
            houseNo,
            street,
            landmark,
            pincode,
            city,
            district,
            state,
            country
        };

        addressRecord.addresses.push(newAddress);
        await addressRecord.save();

        res.status(200).json({ message: 'Address added successfully', redirectUrl: '/profile' });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ message: 'An error occurred while adding the address.' });
    }
};

// Edit Address
const editAddress = async (req, res) => {
    try {
        const userId = req.params.userId;
        const addressId = req.params.addressId;

        // Fetch the user's address record
        const addressRecord = await AddressModel.findOne({ user: userId });

        if (!addressRecord) {
            return res.status(404).render('error', { message: 'Address not found.' });
        }

        // Find the specific address to edit
        const address = addressRecord.addresses.id(addressId);

        if (!address) {
            return res.status(404).render('error', { message: 'Address not found.' });
        }

        // Render the edit form with the current address data
        res.render('user/edit-address', { address, userId, addressId});
    } catch (error) {
        console.error('Error fetching address:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching the address.' });
    }
};

const editAddressPatch = async (req, res) => {
    const { addressType, houseNo, street, landmark, pincode, city, district, state, country } = req.body;
    const userId = req.params.userId; // Assume user ID is available from authentication middleware
    const addressId = req.params.addressId; // Address ID from the route parameter
    console.log(addressId);
    try {
        // Construct the update object
        const updateObject = {
            'addresses.$.addressType': addressType,
            'addresses.$.houseNo': houseNo,
            'addresses.$.street': street,
            'addresses.$.landmark': landmark,
            'addresses.$.pincode': pincode,
            'addresses.$.city': city,
            'addresses.$.district': district,
            'addresses.$.state': state,
            'addresses.$.country': country
        };

        // Update the specific address in the array
        const updatedRecord = await AddressModel.findOneAndUpdate(
            { user: userId, 'addresses._id': addressId },
            { $set: updateObject },
            { new: true, runValidators: true } // 'new' returns the updated document, 'runValidators' ensures schema validation
        );

        if (!updatedRecord) {
            return res.status(404).json({ message: 'Address or user not found' });
        }

        res.status(200).json({ message: 'Address updated successfully', redirectUrl: '/profile' });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const postEditAddress = async (req, res) => {
    const addressId = req.params.id;
    const {
        addressType,
        houseNo,
        street,
        landmark,
        pincode,
        city,
        district,
        state,
        country,
    } = req.body;

    try {
        const updatedAddress = await AddressModel.findByIdAndUpdate(
            addressId,
            {
                addressType,
                houseNo,
                street,
                landmark,
                pincode,
                city,
                district,
                state,
                country,
            },
            { new: true }
        );
        if (!updatedAddress) {
            return res.status(404).json({ message: "Address not found" });
        }
        res.status(200).json({
            message: "Address updated successfully",
            address: updatedAddress,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "An error occurred while updating the address",
        });
    }
};

const deleteAddress = async (req, res) => {
    const { userId, addressId } = req.params;

    try {
        // Find the user's address record
        const addressRecord = await AddressModel.findOne({ user: userId });

        if (!addressRecord) {
            return res.status(404).json({ success: false, message: 'Address record not found.' });
        }

        // Remove the specific address by ID
        const address = addressRecord.addresses.id(addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }

        // Filter out the address with the specified addressId
        addressRecord.addresses = addressRecord.addresses.filter(address => address._id.toString() !== addressId);
        await addressRecord.save();

        res.status(200).json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the address.' });
    }
};


module.exports = {
    profile,
    editProfile,
    editProfilePatch,
    changePassword,
    changePasswordPost,
    addAddress,
    addAddressPost,
    editAddress,
    editAddressPatch,
    deleteAddress
}