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
            console.log("inside session login");
            res.redirect("/admin");
        } else {
            const errorMessage = "Incorrect Email or Password";
            res.render("admin/admin-login", {
                err: errorMessage,
                adminData,
                pagetitle: "User Management",
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
        const adminExist = await AdminModel.findOne({ adminEmail }).exec();
        if (!adminExist) {
            return res.render("admin/admin-login", {
                message: "Invalid Email or Password",
                adminData: req.session.adminData,
                pagetitle: "User Management",
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
                message: "Invalid Password",
                adminData: req.session.adminData,
                pagetitle: "User Management",
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
    console.log(userId, "req.session.userId");
    console.log(req.session.admin, "req.session.admin");
    if (userId == "" && req.session.admin == "") {
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                // Handle errors gracefully (e.g., redirect to an error page)
                return res.status(500).send("Error logging out");
            }

            console.log("Session destroyed");
        });
    }
    console.log("logging ot admin");
    res.redirect("/admin/login"); // Redirect to login page
};

const postAdminRegister = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email || !password) {
            req.session.data = req.body;
            return res.redirect("/admin/signup");
        } else {
            // Hash the password
            const passwordHash = await securePassword(password);

            // Create admin object
            const admin = new AdminModel({
                adminEmail: email,
                adminPassword: passwordHash,
            });

            // Save admin details to the database
            await admin.save();

            // Redirect to login page
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
    const perPage = 5; // Define how many users you want per page
    const page = parseInt(req.query.page) || 1; // Get the page number from the request query parameters
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
