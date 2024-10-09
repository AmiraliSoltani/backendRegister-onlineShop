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

const allowCors = fn => async (req, res) => {
  const origin = req.headers.origin;

  // Allow specific origins based on environment
  const allowedOrigins = [
    'https://online-shop-bek1ig1ij-amiralisoltanis-projects.vercel.app', // Replace with your Vercel frontend URL
    'http://localhost:3000' // Local development frontend
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // Allow specific origin
  } else {
    res.setHeader('Access-Control-Allow-Origin', origin); // Allow the origin for any other cases (optional)
  }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// Register Handler
const handler = async (req, res) => {
  if (req.method === 'POST') {
    try {
      // Parse request body
      const body = await parseBody(req);
console.log("Request Body:", body);


      // Extract form data
      const { username, password, name, lastName } = body;

      if (!username || !password || !name || !lastName) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Connect to MongoDB
      await userService.connectMongo();

      // Register the user
      const user = await userService.registerUser({ username, password, name, lastName });

      // Create JWT payload
      let payload = {
        _id: user._id,
        username: user.username,
        name: user.name,
        lastName: user.lastName,
        lastVisitedProducts: [],
        popularProducts: [],
        shoppingCart: [],
        lastSearches: []
      };

      // Sign JWT token
      let token = jwt.sign(payload, process.env.JWT_SECRET);

      res.status(200).json({ message: 'Registration successful', token });
    } catch (err) {
      console.error("Error during registration:", err);
      res.status(400).json({ error: err.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

module.exports = allowCors(handler);


// const allowCors = fn => async (req, res) => {
//   const origin = req.headers.origin;

//   // Allow specific origins based on environment
//   const allowedOrigins = [
//     'https://online-shop-six-iota.vercel.app/' , // Replace with your Vercel frontend URL
//     'http://localhost:3000' // Local development frontend
//   ];

//   if (allowedOrigins.includes(origin)) {
//     res.setHeader('Access-Control-Allow-Origin', origin); // Allow specific origin
//   }
//   else{
//     res.setHeader('Access-Control-Allow-Origin', origin); // Allow specific origin
//   }

//   res.setHeader('Access-Control-Allow-Credentials', true);
//   res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
//   res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

//   if (req.method === 'OPTIONS') {
//     res.status(200).end();
//     return;
//   }
//   return await fn(req, res);
// }

// const handler = async (req, res) => {
//   if (req.method === 'POST') {
//     res.status(200).json({ message: 'Register API hit successfully!' });
//   } else {
//     res.status(405).json({ message: 'Method not allowed' });
//   }
// }

// module.exports = allowCors(handler);

  


