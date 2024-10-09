// api/auth/callback.js
const passport = require("passport");
const jwt = require("jsonwebtoken");

// Middleware for handling CORS
const allowCors = fn => async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://online-shop-bek1ig1ij-amiralisoltanis-projects.vercel.app',
    'http://localhost:3000'
  ];

//   if (allowedOrigins.includes(origin)) {
//     res.setHeader('Access-Control-Allow-Origin', origin);
//   } else {
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

// Handler to process Google OAuth callback
const handler = (req, res) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err || !user) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    const payload = {
      _id: user._id,
      username: user.username,
      name: user.name,
      lastVisitedProducts: user.lastVisitedProducts || [],
      popularProducts: user.popularProducts || [],
      shoppingCart: user.shoppingCart || [],
      lastSearches: user.lastSearches || []
    };

    // Generate a JWT token for the authenticated user
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });

    // Send the token back to the frontend using window.postMessage
    const htmlResponse = `
      <script>
        window.opener.postMessage({ token: "${token}" }, "*");
        window.close();
      </script>
    `;

    res.send(htmlResponse);
  })(req, res);
};

module.exports = allowCors(handler);
