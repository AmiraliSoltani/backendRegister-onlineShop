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
    console.log("logggggggggggggggggggg");

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
    console.log("logggg222222222222222222222222222");

    const body = await parseBody(req);
    console.log("Request Body:", body);

    try {
        await userService.connectMongo();

        userService
        .checkUser(body)
        .then((user) => {
          let payload = {
            _id: user._id,
            username: user.username,
            name: user.name,
            lastName: user.lastName,
            lastVisitedProducts: user.lastVisitedProducts,
            popularProducts: user.popularProducts,
            shoppingCart: user.shoppingCart,
            lastSearches: user.lastSearches, // Include lastSearches here
          };
    
          let token = jwt.sign(payload, jwtOptions.secretOrKey);
    
          res.json({ message: "login successful", token: token, user: user });
        })
        .catch((msg) => {
          console.log("byeeeeeee",msg);
    
          res.status(422).json({ message: msg });
        });
        
    } catch (err) {
      console.error("Error during registration:", err);
      res.status(400).json({ error: err.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};

module.exports = allowCors(handler);