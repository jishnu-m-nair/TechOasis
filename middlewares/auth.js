const user = require("../model/user-model");

const isLoggedIn = async (req, res, next) => {
    if (!req.session.userId || req.session.userId === "") {
        res.redirect("/login");
    } else {
        const foundUser = await user.findById(req.session.userId);
        if (foundUser.isBlocked) {
            return res.redirect("/logout");
        } else {
            next();
        }
    }
};

const isLoggedOut = (req, res, next) => {
    if (req.session.userId == "" || req.session.userId == undefined) {
        next();
    } else {
        res.redirect("/home");
    }
};

const isAdmin = (req, res, next) => {
    if (!req.session.admin == "") {
        next();
    } else {
        res.redirect("/admin/login");
    }
};

module.exports = {
    isLoggedIn,
    isLoggedOut,
    isAdmin,
};
