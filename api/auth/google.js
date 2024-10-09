const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Middleware for handling CORS
const allowCors = fn => async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://online-shop-bek1ig1ij-amiralisoltanis-projects.vercel.app',
    'http://localhost:3000'
  ];

//   if (allowedOrigins.includes(origin)) {
//     res.setHeader('Access-Control-Allow-Origin', origin);
//   }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return await fn(req, res);
};

// Initialize the Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://backend-register-online-shop.vercel.app/auth/google/callback"
    },
    (accessToken, refreshToken, profile, done) => {
      // No need to handle anything here; callback.js will handle the user logic.
      done(null, profile);
    }
  )
);

// Handler to start Google OAuth process
const handler = (req, res) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res);
};

// Export the handler with CORS support
module.exports = allowCors(handler);
