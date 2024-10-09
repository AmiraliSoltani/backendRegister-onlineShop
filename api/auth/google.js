const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userService = require("../../user-service");

// Initialize the Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://backend-register-online-shop.vercel.app/auth/google/callback" // Use correct callback URL
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        // Find or create the user in your database
        const user = await userService.findOrCreate({
          googleId: profile.id,
          username: profile.emails[0].value,
          name: profile.displayName
        });

        const payload = {
          _id: user._id,
          username: user.username,
          name: user.name,
          lastVisitedProducts: user.lastVisitedProducts || [],
          popularProducts: user.popularProducts || [],
          shoppingCart: user.shoppingCart || [],
          lastSearches: user.lastSearches || []
        };

        done(null, payload);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Middleware for handling CORS
const allowCors = fn => async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://online-shop-bek1ig1ij-amiralisoltanis-projects.vercel.app',
    'http://localhost:3000'
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return await fn(req, res);
};

// Handler to start Google OAuth manually
const handler = (req, res) => {
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })(req, res); // Call passport.authenticate manually without next()
};

// Export with CORS support
module.exports = allowCors(handler);
