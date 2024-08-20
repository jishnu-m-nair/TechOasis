const UserModel = require("../../model/user-model");
const AdminModel = require("../../model/admin-model");
const OrderModel = require("../../model/order-model");
const bcrypt = require("bcryptjs");
const { securePassword, formatDate } = require('../../utils/helpers');

//admin login
const adminLogin = async (req, res) => {
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
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const adminLoginPost = async (req, res) => {
    try {
        const { adminEmail, adminPassword } = req.body;

        req.session.adminData = {
            adminEmail,
            adminPassword,
        };
        const adminExist = await AdminModel.findOne({ adminEmail });
        if (!adminExist) {
            return res.render("admin/admin-login", {
                err: "Invalid Email or Password",
                adminData: req.session.adminData,
            });
        }

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
        res.render('500', { errorMessage: error })
    }
};

// admin logout
const adminLogout = (req, res) => {
    req.session.admin = "";
    const userId = req.session?.userId || "";
    if (userId == "" && req.session.admin == "") {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send("Error logging out");
            }
        });
    }
    res.redirect("/admin/login");
};

// optional contoller for admin register
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
            res.redirect("/admin/login");
        }
    } catch (e) {
        // res.redirect("/admin/signup");
        res.send("catch error");
    }
};

// user management
const userManagement = async (req, res) => {
    try {
        res.render("admin/user-management", {
            pagetitle: "User Management",
            page: "user-management"
        });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const blockUser = async (req, res) => {
    let { id } = req.body;
    let userData = await UserModel.findById(id);
    if (userData) {
        if (userData.isBlocked === true) {
            userData.isBlocked = false;
            userData.save();
            res.status(200).json({
                status: true,
                message: "The user has been successfully unblocked",
                userStatus: "active"
            });
        } else if (userData.isBlocked === false) {
            userData.isBlocked = true;
            userData.save();
            res.status(200).json({
                status: true,
                message: "The user has been successfully blocked",
                userStatus: "block"
            });
        }
    } else {
        res.status(400).json({
            status: false,
        });
    }
};

const filterUsers = async (req, res) => {
    try {
        const { filter, search } = req.body;
        const page = parseInt(req.body.page) || 1;
        const perPage = 10;

        let query = {};

        if (filter === 'true') {
            query.isBlocked = true;
        } else if (filter === 'false') {
            query.isBlocked = false;
        }

        if (search) {
            query.$or = [
                { fullname: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await UserModel.find(query)
            .skip((page - 1) * perPage)
            .limit(perPage)
            .select('fullname email phone isBlocked');

        const totalUsers = await UserModel.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / perPage);

        res.status(200).json({ success: true, users, currentPage: page, totalPages, perPage });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};


const getSalesReportPage = async (req, res) => {
    try {
        const order = await OrderModel.find({ status: 'Delivered' }).populate('user');

        res.render('admin/sales-report', {
            pagetitle: "Sales Report",
            page: "sales-report",
            order
        });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
}

const generateSalesReport = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.body;
        let query = { status: "Delivered" };
        let reportStartDate, reportEndDate;

        switch (reportType) {
            case 'daily':
                reportStartDate = new Date();
                reportStartDate.setHours(0, 0, 0, 0);
                reportEndDate = new Date();
                query.orderDate = { $gte: reportStartDate };
                break;
            case 'weekly':
                reportStartDate = new Date();
                reportStartDate.setDate(reportStartDate.getDate() - 7);
                reportEndDate = new Date();
                query.orderDate = { $gte: reportStartDate };
                break;
            case 'yearly':
                reportStartDate = new Date();
                reportStartDate.setFullYear(reportStartDate.getFullYear() - 1);
                reportEndDate = new Date();
                query.orderDate = { $gte: reportStartDate };
                break;
            case 'custom':
                if (startDate && endDate) {
                    reportStartDate = new Date(startDate);
                    reportEndDate = new Date(endDate);
                    query.orderDate = {
                        $gte: reportStartDate,
                        $lte: reportEndDate
                    };
                }
                break;
            default:
                reportStartDate = new Date();
                reportStartDate.setMonth(reportStartDate.getMonth() - 1);
                reportEndDate = new Date();
                query.orderDate = { $gte: reportStartDate };
                break;
        }

        const orders = await OrderModel.find(query)
            .populate('user', 'email')
            .sort({ orderDate: -1 });

        const totalOrders = orders.length;
        const totalSales = orders.reduce((sum, order) => sum + order.billTotal, 0);

        const reportDate = formatDate(new Date());
        const fromDate = formatDate(reportStartDate);
        const toDate = formatDate(reportEndDate);
        res.json({
            success: true,
            orders,
            totalOrders,
            totalSales,
            fromDate,
            toDate,
            reportDate
            
        });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
}

module.exports = {
    adminLogin,
    adminLoginPost,
    adminLogout,
    postAdminRegister,
    userManagement,
    blockUser,
    filterUsers,
    getSalesReportPage,
    generateSalesReport
};