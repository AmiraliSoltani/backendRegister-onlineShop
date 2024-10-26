const jwt = require("jsonwebtoken");
const userService = require("../../user-service");

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

// Last Visited Handler for dynamic id
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
  const productId = req.query.id; // Extract dynamic ID from the URL
  console.log("userId",userId)
  
  console.log("productId",productId)

  console.log("req.query",req.query)

  // Handle PUT requests to add last visited product
  if (req.method === 'PUT') {
    try {

      const body = await parseBody(req); // Parse request body for additional data if needed
      
      const updatedVisited = await userService.addLastVisited(userId, productId);
      res.status(200).json(updatedVisited);

    } catch (err) {
      console.log("heree",err,"productId",productId)
      res.status(400).json({ error: err.message });
    }

  // Handle DELETE requests to remove last visited product
  } else if (req.method === 'DELETE') {
    try {
      const updatedVisited = await userService.removeLastVisited(userId, productId);
      res.status(200).json(updatedVisited);
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
