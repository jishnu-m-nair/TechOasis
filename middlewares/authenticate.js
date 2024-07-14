const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const UserModel = require("../model/user-model");
require("dotenv").config();

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await UserModel.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await UserModel.findOne({
                    email: profile.emails[0].value,
                });

                if (user) {
                    if (user.isBlocked) {
                        return done(null, false, {
                            message: "User is blocked",
                        });
                    }
                    // If user is not blocked them log them to home
                    return done(null, user);
                } else {
                    // User does not exist, create a new user
                    user = new UserModel({
                        email: profile.emails[0].value,
                        fullname: profile.displayName,
                        isVerified: true,
                        password: "",
                        googleId: profile.id,
                        phone: null
                    });

                    await user.save();
                    return done(null, user);
                }
            } catch (err) {
                console.error("Error during Google authentication:", err);
                return done(err, null);
            }
        }
    )
);
