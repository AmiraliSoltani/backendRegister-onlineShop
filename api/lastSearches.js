const jwt = require("jsonwebtoken");
const userService = require("../user-service");

// Helper to parse JSON body
async function parseBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  return JSON.parse(body);
}

console.log("logggggggggggggggggggg");

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
  }
 else {
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
  if (req.method === 'PUT') {
    const body = await parseBody(req);
    const authHeader = req.headers.authorization;
    await userService.connectMongo();

    if (!authHeader || !authHeader.startsWith('JWT ')) {
      return res.status(401).json({ message: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    console.log("decoded",decoded);

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      // Call user service to add the search object
      const updatedSearches = await userService.addLastSearch(decoded._id, body);
      res.status(200).json(updatedSearches);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

module.exports = allowCors(handler);
