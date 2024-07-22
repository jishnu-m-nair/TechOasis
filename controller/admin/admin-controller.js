// const ProductModel = require("../model/productSchema");
const UserModel = require("../../model/user-model");
const AdminModel = require("../../model/admin-model");
const bcrypt = require("bcryptjs");
// const fs = require('fs');

//admin login controllers
let adminlogin = async (req, res) => {
    req.session.admin = "";

    try {
        let adminData = {
            adminEmail: "",
            adminPassword: "",
        };

        if (req.session.adminData) {
            adminData = req.session.adminData;
        }

        if (!req.session.admin == "") {
            res.redirect("/admin");
        } else {
            res.render("admin/admin-login", {
                err: '',
                adminData,
            });
        }
    } catch (error) {
        console.error("Error in adminlogin:", error);
        res.status(500).json({
            message: "Server error",
        });
    }
};

//   adminloginpost
let adminloginpost = async (req, res) => {
    try {
        const { adminEmail, adminPassword } = req.body;

        req.session.adminData = {
            adminEmail,
            adminPassword,
        };

        // Find admin by email
        const adminExist = await AdminModel.findOne({ adminEmail });
        if (!adminExist) {
            return res.render("admin/admin-login", {
                err: "Invalid Email or Password",
                adminData: req.session.adminData,
            });
        }

        // Compare passwords
        const isPassWordValid = await bcrypt.compare(
            adminPassword,
            adminExist.adminPassword
        );

        if (isPassWordValid) {
            req.session.admin = adminExist._id;
            return res.redirect("/admin");
        } else {
            return res.render("admin/admin-login", {
                err: "Invalid Password",
                adminData: req.session.adminData,
            });
        }
    } catch (error) {
        console.error("Error during login:", error);

        // Handle specific errors
        if (error.code === 500) {
            return res.status(500).json({ message: "Server error" });
        } else {
            return res.status(400).json({ message: "Bad request" });
        }
    }
};

let adminlogout = (req, res) => {
    // console.log(req.session);
    // req.session.admin = false;
    // console.log("session destroyed");
    // res.redirect("/admin/login");
    req.session.admin = "";
    const userId = req.session?.userId || "";
    if (userId == "" && req.session.admin == "") {
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).send("Error logging out");
            }

            console.log("Session destroyed");
        });
    }
    console.log("logging ot admin");
    res.redirect("/admin/login");
};

const postAdminRegister = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            req.session.data = req.body;
            return res.redirect("/admin/signup");
        } else {
            const passwordHash = await securePassword(password);

            const admin = new AdminModel({
                adminEmail: email,
                adminPassword: passwordHash,
            });

            await admin.save();
            // res.redirect("/admin/login");
            res.send("successful");
        }
    } catch (e) {
        console.error(e);
        // res.redirect("/admin/signup");
        res.send("catch error");
    }
};

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
    }
};

let usermanagement = async (req, res) => {
    const perPage = 5;
    const page = parseInt(req.query.page) || 1;
    try {
        const totalUsers = await UserModel.countDocuments();
        const userdetails = await UserModel.find()
            .skip(perPage * (page - 1))
            .limit(perPage)
            .exec();

        const totalPages = Math.ceil(totalUsers / perPage);

        res.render("admin/user-management", {
            userdetails,
            currentPage: page,
            totalPages,
            perPage,
            pagetitle: "User Management",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: error.message || "Internal Server Error",
        });
    }
};

let userblock = async (req, res) => {
    let { id } = req.body;
    let userData = await UserModel.findById(id);
    if (userData) {
        if (userData.isBlocked === true) {
            userData.isBlocked = false;
            userData.save();
            res.status(200).json({
                status: true,
            });
        } else if (userData.isBlocked === false) {
            userData.isBlocked = true;
            userData.save();
            res.status(201).json({
                status: true,
            });
        }
    } else {
        res.status(402).json({
            status: true,
        });
    }
};

module.exports = {
    adminlogin,
    adminloginpost,
    adminlogout,
    postAdminRegister,
    usermanagement,
    userblock,
};
