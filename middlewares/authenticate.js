const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv').config();
const UserModel = require('../model/userSchema');

passport.serializeUser((user, done) => {
    done(null, user.id);
})

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find the user based on their Google ID
      let user = await UserModel.findOne({ email: profile.emails[0].value });

      if (user) {
        // Check if the user is blocked
        if (user.isBlocked) {
            return done(null, false, { message: 'User is blocked' });
        }

        // User exists and is not blocked, log them in
        
        return done(null, user);
    } else {
        // User does not exist, create a new user
        user = new UserModel({
          email: profile.emails[0].value,
          fullname: profile.displayName,
          isVerified: true,
          password: "", // No password since it's a Google login
          googleId: profile.id, // Optional: add a field for Google ID if you want
          // Initialize other fields if needed
        });

        await user.save();
        return done(null, user);
      }
    } catch (err) {
      console.error("Error during Google authentication:", err);
      return done(err, null);
    }
  }
));