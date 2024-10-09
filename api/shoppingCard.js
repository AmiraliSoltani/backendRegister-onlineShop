const jwt = require("jsonwebtoken");
const userService = require("../user-service");

// Helper to parse JSON body
async function parseBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error('Invalid JSON input');
  }
}

// Middleware for handling CORS
const allowCors = fn => async (req, res) => {
  const origin = req.headers.origin;

  // Allowed origins
  const allowedOrigins = [
    'https://online-shop-bek1ig1ij-amiralisoltanis-projects.vercel.app',
    'http://localhost:3000'
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', origin); // Allow the origin for any other cases (optional)
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

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// Last Searches Handler
const handler = async (req, res) => {
  await userService.connectMongo();

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('JWT ')) {
    return res.status(401).json({ message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const userId = decoded._id;

  // Handle PUT requests
  if (req.method === 'PUT') {
    try {
      const body = await parseBody(req);

      console.log("User ID:", userId); // Log the user ID
      console.log("Shopping Cart Data:", body); // Log the shopping cart data

      userService
        .addNewShoppingCart(userId, body)
        .then((data) => {
          console.log("Updated Shopping Cart:", data); // Log the updated shopping cart data
          res.json(data);
        })
        .catch((msg) => {
          console.error("Error:", msg); // Log any errors
          res.status(422).json({ error: msg });
        });

    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

// Export the handler function with CORS support
module.exports = allowCors(handler);
