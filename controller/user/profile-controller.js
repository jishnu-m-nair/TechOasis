const mongoose = require("mongoose");
const UserModel = require("../../model/user-model");
const AddressModel = require("../../model/address-model");
const OrderModel = require("../../model/order-model");
const WalletModel = require("../../model/wallet-model");
const bcrypt = require("bcryptjs");

// Password Hashing
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

// Profile
const profile = async (req, res) => {
    try {
        const userId = req.session.userId;
        const userInfo = await UserModel.findById(userId);
        const addressDocument = await AddressModel.findOne({ user: userId });
        const orderDetails = await OrderModel.find({ user: userId }).sort({ createdAt: -1 });
        const wallet = await WalletModel.findOne({ owner: userId });
        if(!wallet) {
            const userWallet = new WalletModel({
                owner: userId,
                balance: 0,
                transactions: []
            })
    
            await userWallet.save();
        }
        const addresses = addressDocument ? addressDocument.addresses : [];

        res.render('user/profile', { userInfo, addresses, userId, orderDetails, wallet, pageTitle: "Profile Page" });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

// Edit Profile
const editProfile = async (req, res) => {
    try {
        const userId = req.session.userId;
        const userInfo = await UserModel.findById(userId);

        res.render("user/edit-profile", { userInfo, pageTitle: "Edit Profile Page" });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const editProfilePatch = async (req, res) => {
    const { fullname, phone } = req.body;
    const userId = req.session.userId;

    try {
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
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

// Change Password
const changePassword = async (req, res) => {
    try {
        res.render("user/change-password", { pageTitle: "Change Password Page" });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const changePasswordPost = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New password and confirm password do not match." });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long." });
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
            return res.status(400).json({ message: "Current password is incorrect." });
        }
        let newPasswordHash = await securePassword(newPassword);

        const updatedUser = await UserModel.findOneAndUpdate(
            { _id: userData._id },
            { password: newPasswordHash },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(500).json({ message: "An error occurred while updating the password." });
        }

        return res.status(200).json({
            message: "User password updated",
            redirectUrl: "/profile"
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred while changing the password." });
    }
};

// Add Address
const addAddress = (req, res) => {
    try {
        const userId = req.session.userId;
        res.render("user/add-address", { userId, pageTitle: "Add Address Page" });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const addAddressPost = async (req, res) => {
    try {
        const { userId, addressType, houseNo, street, landmark, pincode, city, district, state, country, source } = req.body;

        let addressRecord = await AddressModel.findOne({ user: userId });

        if (!addressRecord) {
            addressRecord = new AddressModel({ user: userId, addresses: [] });
        }

        if (addressRecord.addresses.length >= 3) {
            return res.status(400).json({ message: 'You can only have up to 3 addresses.' });
        }

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

        const redirectUrl = source === 'checkout' ? '/checkout' : '/profile?tab=address';

        res.status(200).json({ message: 'Address added successfully', redirectUrl });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred while adding the address.' });
    }
};

// Edit Address
const editAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.addressId;

        const addressRecord = await AddressModel.findOne({ user: userId });

        if (!addressRecord) {
            return res.status(404).render('error', { message: 'Address not found.', pageTitle: "Edit Address Page" });
        }

        const address = addressRecord.addresses.id(addressId);

        if (!address) {
            return res.status(404).render('error', { message: 'Address not found.', pageTitle: "Edit Address Page" });
        }

        res.render('user/edit-address', { address, userId, addressId, pageTitle: "Edit Address Page" });
    } catch (error) {
        res.status(500).render('error', { message: 'An error occurred while fetching the address.', pageTitle: "Edit Address Page" });
    }
};

const editAddressPatch = async (req, res) => {
    const { addressType, houseNo, street, landmark, pincode, city, district, state, country, source } = req.body;
    const userId = req.session.userId;
    const addressId = req.params.addressId;
    try {
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

        const redirectUrl = source === 'checkout' ? '/checkout' : '/profile?tab=address';
        res.status(200).json({ message: 'Address updated successfully', redirectUrl });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const deleteAddress = async (req, res) => {
    const { addressId } = req.params;
    const userId = req.session.userId

    try {
        const addressRecord = await AddressModel.findOne({ user: userId });

        if (!addressRecord) {
            return res.status(404).json({ success: false, message: 'Address record not found.' });
        }

        const address = addressRecord.addresses.id(addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }

        addressRecord.addresses = addressRecord.addresses.filter(address => address._id.toString() !== addressId);
        await addressRecord.save();

        res.status(200).json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred while deleting the address.' });
    }
};

const filterOrders = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { page = 1 } = req.query;
        const limit = 10
        let query = { user: userId };

        const orders = await OrderModel.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalOrders = await OrderModel.countDocuments(query);

        res.json({
            success: true,
            orders,
            totalPages: Math.ceil(totalOrders / limit),
            currentPage: parseInt(page),
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
};

const filterTransactions = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { page = 1 } = req.query;
        const limit = 10;

        const wallet = await WalletModel.findOne({ owner: userId });
        if (!wallet) {
            return res.json({
                success: true,
                transactions: [],
                totalPages: 0,
                currentPage: 1,
            });
        }

        let filteredTransactions = wallet.transactions;

        const totalTransactions = filteredTransactions.length;

        const paginatedTransactions = filteredTransactions
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            transactions: paginatedTransactions,
            totalPages: Math.ceil(totalTransactions / limit),
            currentPage: parseInt(page),
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
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
    deleteAddress,
    filterOrders,
    filterTransactions
}