const user = require("../model/user-model");

const isLoggedIn = (req, res, next) => {
    if (!req.session.userId || req.session.userId === "") {
        res.redirect("/login");
    } else {
        next();
    }
};

const isLoggedOut = (req, res, next) => {
    if (req.session.userId == "" || req.session.userId == undefined) {
        next();
    } else {
        console.error("User already logged in:");
        res.redirect("/home");
    }
};

const AdminLogSession = (req, res, next) => {
    if (!req.session.admin == "") {
        next();
    } else {
        res.redirect("/admin/login");
    }
};

const isBlockedUser = async (req, res, next) => {
    let errorMessage = "";
    let data = {};
    try {
        const userId = req.session.userId;
        const foundUser = await user.findById(userId);
        if (foundUser.isBlocked) {
            return res.redirect("/logout");
        } else {
            next();
        }
    } catch (error) {
        errorMessage = "Error checking user block status";
        res.render("user/login", {
            err: errorMessage,
            data,
            errorMessage,
            pageTitle: "Login Page",
        });
        console.error("Error checking user block status:", error);
        return res.status(500).send("Error checking user block status");
    }
};

module.exports = {
    isLoggedIn,
    isLoggedOut,
    AdminLogSession,
    isBlockedUser,
};
