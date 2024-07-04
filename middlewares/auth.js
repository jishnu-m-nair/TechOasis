const user = require("../model/user-model");

const isLoggedIn = (req, res, next) => {
    let errorMessage = "";
    data = {}
    if (req.session.email || req.session.userId ) {
        next();
    } else {
        errorMessage = "User not logged in!"
        console.error("User not logged in!");
        res.render('user/login',{
            err: errorMessage,
            data,
            errorMessage,
            pageTitle: "Login Page"
        })
        // res.redirect("/login");
    }
};

const isLoggedOut = (req, res, next) => {
   if (!req.session.email && !req.session.userId) {
       next();
   } else {
       console.error("User already logged in:");
       res.redirect("/home"); // Redirect to home or any other page you want
   }
};

const AdminLogSession = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        res.redirect("/admin/login");
    }
};

const isAuthenticated = (req, res, next) => {
    console.log(req.session.email);
    if (req.session.email) {
        // User is authenticated, redirect them to the home page
        return res.redirect("/");
    } else {
        // User is not authenticated, continue to the next middleware or route handler
        next();
    }
};

const isBlockedUser = async (req, res, next) => {
    let errorMessage = "";
    let data = {}
    try {
        // Fetch user data using the authenticated user's ID (assuming stored in session)
        const userId = req.session.userId; // Replace with the actual session property
        const foundUser = await user.findById(userId);

        if (!foundUser) {
            // Handle case where user data not found (e.g., log error or redirect)
            errorMessage = "User not found";
            console.error("User is blocked");
            return res.render('user/login',{
                err: errorMessage,
                data,
                errorMessage,
                pageTitle: "Login Page"
            }); // Or handle differently based on your application logic
        }

        // // Check if user is blocked based on the 'isBlocked' field
        // if (foundUser.isBlocked) {
        //     errorMessage = "User is blocked";
        //     return res.render('login',{
        //         err: errorMessage,
        //         data,
        //         errorMessage
        //     }); // Redirect to login if blocked
        // }

        // User is authenticated, not blocked, proceed to next middleware
        next();
    } catch (error) {
        errorMessage = "Error checking user block status";
        res.render('user/login',{
            err: errorMessage,
            data,
            errorMessage,
            pageTitle: "Login Page"
        })
        console.error("Error checking user block status:", error);
        // Handle errors gracefully, e.g., redirect to an error page or return an error response
        return res.status(500).send("Error checking user block status"); // Or handle differently based on your needs
    }
};

module.exports = {
    isLoggedIn,
    AdminLogSession,
    isAuthenticated,
    isBlockedUser,
    isLoggedOut
};
