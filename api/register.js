const allowCors = fn => async (req, res) => {
  const origin = req.headers.origin;

  // Allow specific origins based on environment
  const allowedOrigins = [
    'http://localhost:3000',  // Local development frontend
    'https://online-shop-bek1ig1ij-amiralisoltanis-projects.vercel.app/'  // Replace with your Vercel frontend URL
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // Allow specific origin
  }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
}

const handler = async (req, res) => {
  if (req.method === 'POST') {
    res.status(200).json({ message: 'Register API hit successfully!' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

module.exports = allowCors(handler);

  


// // api/products.js
// const express = require("express");
// const app = express();
// const mongoose = require("mongoose");
// const cors = require("micro-cors")({
//   allowMethods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
//   allowHeaders: ["Authorization", "Content-Type"],
//   origin: "*", // Replace with the origin of your React app
// });
// // Import your Mongoose model

// // Import your Mongoose model

// mongoose.connect(
//   "mongodb+srv://asoltani7:wXxeR5GlT4n4X6z1@cluster0.efuoscy.mongodb.net/onlineShop?retryWrites=true&w=majority",
//   {
//     useUnifiedTopology: true,
//   }
// );

// async function handler(req, res) {
//   res.setHeader("Access-Control-Allow-Credentials", true);
//   res.setHeader("Access-Control-Allow-Origin", "*");

//   res.setHeader(
//     "Access-Control-Allow-Methods",
//     "GET,OPTIONS,PATCH,DELETE,POST,PUT"
//   );
//   res.setHeader(
//     "Access-Control-Allow-Headers",
//     "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
//   );
//   if (req.method === "OPTIONS") {
//     res.status(200).end();
//     return;
//   }

//   if (req.method === "GET") {


//   } else if (req.method === "POST") {
//       res.setHeader("Content-Type", "application/json"); // Set the content type if not set
//       res.send("CORS is working, Hello World!");

//   } else if (req.method === "DELETE") {

//   }
// else {
//     res.status(405).send("Method Not Allowed");
//   }
// }

// const corsHandler = cors(handler);

// // Apply CORS to the handler and export it
// module.exports = corsHandler;
