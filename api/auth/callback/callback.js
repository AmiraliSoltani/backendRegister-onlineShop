const jwt = require("jsonwebtoken");
const userService = require("../../../user-service");

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

// Function to process Google OAuth callback manually
const handler = async (req, res) => {
  try {
    // Extract authorization code from query parameters
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: "Missing authorization code" });
    }

    // Exchange authorization code for access token using Google's API
    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.CALLBACK_URL);

    const { tokens } = await client.getToken(code); // Fetch tokens (including access token) from Google
    client.setCredentials(tokens);

    // Get user info from Google using the access token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.CLIENT_ID
    });

    const payload = ticket.getPayload();
    const googleId = payload['sub'];

    // Find or create user in the database
    const user = await userService.findOrCreate({
      googleId: googleId,
      username: payload.email,
      name: payload.name
    });

    // Create a JWT token for the authenticated user
    const jwtPayload = {
      _id: user._id,
      username: user.username,
      name: user.name,
      lastVisitedProducts: user.lastVisitedProducts || [],
      popularProducts: user.popularProducts || [],
      shoppingCart: user.shoppingCart || [],
      lastSearches: user.lastSearches || []
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: "24h" });

    // Send the token back to the frontend using window.postMessage
    const htmlResponse = `
      <script>
        window.opener.postMessage({ token: "${token}" }, "*");
        window.close();
      </script>
    `;

    res.send(htmlResponse);

  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = allowCors(handler);
