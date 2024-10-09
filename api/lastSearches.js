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

      // Call user service to add the search object
      const updatedSearches = await userService.addLastSearch(userId, body);
      res.status(200).json(updatedSearches);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }

  // Handle GET requests
  } else if (req.method === 'GET') {
    try {
      // Call user service to get last searches
      const lastSearches = await userService.getLastSearches(userId);
      res.status(200).json(lastSearches);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  // Handle DELETE requests
  } else if (req.method === 'DELETE') {
    try {
      // Call user service to clear last searches
      await userService.clearLastSearches(userId);
      res.status(200).json({ message: 'Last searches cleared' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }

  // If method is not allowed
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

// Export the handler function with CORS support
module.exports = allowCors(handler);
