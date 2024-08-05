const UserModel = require("../../model/user-model");
const AdminModel = require("../../model/admin-model");
const OrderModel = require("../../model/order-model");
const bcrypt = require("bcryptjs");
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { securePassword } = require('../../utils/helpers');

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
        console.error("Error in adminlogin:", error);
        res.status(500).json({
            message: "Server error",
        });
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
        console.error("Error during login:", error);
        if (error.code === 500) {
            return res.status(500).json({ message: "Server error" });
        } else {
            return res.status(400).json({ message: "Bad request" });
        }
    }
};

// admin logout
const adminLogout = (req, res) => {
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
        console.error(e);
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
        console.error(error);
        res.status(500).json({
            message: error.message || "Internal Server Error",
        });
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
        console.error('Error fetching filtered users:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// sales report
const getSalesReportPage = async (req, res) => {
    try {
        res.render('admin/sales-report', {
            pagetitle: "Sales Report",
            page: "sales-report"
        });
    } catch (error) {
        console.error('Error rendering sales report page:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const loadSales = async (req, res) => {
    try {
        const perPage = 10;
        const page = parseInt(req.body.page) || 1;

        const totalOrders = await OrderModel.countDocuments({ status: "Delivered" });
        const totalPages = Math.ceil(totalOrders / perPage);

        const orders = await OrderModel
            .find({ status: "Delivered" })
            .populate('user')
            .skip(perPage * (page - 1))
            .limit(perPage)
            .sort({ orderDate: -1 });

        res.json({ orders, currentPage: page, totalPages });
    } catch (err) {
        console.error('Error loading sales:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const generateSalesReport = async (req, res) => {
    try {
        const { type, startDate, endDate, format } = req.body;
        let query = { status: "Delivered" };

        if (type === 'custom' && startDate && endDate) {
            query.orderDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else if (type === 'daily') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            query.orderDate = { $gte: today };
        } else if (type === 'weekly') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            query.orderDate = { $gte: oneWeekAgo };
        } else if (type === 'monthly') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            query.orderDate = { $gte: oneMonthAgo };
        } else if (type === 'yearly') {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            query.orderDate = { $gte: oneYearAgo };
        }

        const orders = await OrderModel.find(query).populate('user').sort({ orderDate: -1 });

        const totalSales = orders.reduce((sum, order) => sum + order.billTotal, 0);
        const totalOrders = orders.length;
        const totalPages = Math.ceil(totalOrders / 10);

        if (format === 'pdf') {
            return generatePDF(orders, res);
        } else if (format === 'excel') {
            return generateExcel(orders, res);
        } else {
            return res.json({
                orders,
                totalSales,
                totalOrders,
                currentPage: 1,
                totalPages
            });
        }
    } catch (error) {
        console.error('Error generating sales report:', error.message);
        res.status(500).json({ error: 'Error generating sales report' });
    }
};

const generatePDF = (orders, res) => {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Sales Report', { align: 'center' });
    doc.moveDown();

    orders.forEach((order, index) => {
        doc.fontSize(12).text(`Order #${index + 1}`);
        doc.text(`Order ID: ${order.oId}`);
        doc.text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`);
        doc.text(`Email: ${order.user.email}`);
        doc.text(`Total: INR ${order.billTotal}`);
        doc.text(`Status: ${order.status}`);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.moveDown();
    });

    doc.end();
};

const generateExcel = (orders, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 15 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Payment Method', key: 'paymentMethod', width: 20 },
    ];

    orders.forEach(order => {
        worksheet.addRow({
            orderId: order.oId,
            date: new Date(order.orderDate).toLocaleDateString(),
            email: order.user.email,
            total: order.billTotal,
            status: order.status,
            paymentMethod: order.paymentMethod
        });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

    workbook.xlsx.write(res).then(() => res.end());
};

module.exports = {
    adminLogin,
    adminLoginPost,
    adminLogout,
    postAdminRegister,
    userManagement,
    blockUser,
    filterUsers,
    getSalesReportPage,
    loadSales,
    generateSalesReport,
    generatePDF,
    generateExcel
};