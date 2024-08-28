const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const UserModel = require("../model/user-model");
const WalletModel = require("../model/wallet-model");
const { generateReferralCode } = require('../utils/helpers');
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
                    const newReferralCode = await generateReferralCode(8);
                    
                    user = new UserModel({
                        email: profile.emails[0].value,
                        fullname: profile.displayName,
                        isVerified: true,
                        password: "",
                        googleId: profile.id,
                        phone: null,
                        referralCode: newReferralCode,
                        referredBy: ''
                    });

                    await user.save();
                    const userWallet = new WalletModel({
                        owner: user._id,
                        balance: 0,
                        transactions: []
                    })
                    await userWallet.save();
                    return done(null, user);
                }
            } catch (err) {
                return done(err, null);
            }
        }
    )
);
