require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const jwt = require("jsonwebtoken");
const passportJWT = require("passport-jwt");
const userService = require("./user-service.js");
const { OAuth2Client } = require("google-auth-library");

const app = express();

const cors = require("cors");

// CORS options for Express
const corsOptions = {
  origin: "http://localhost:3000", // Replace with the exact URL of your React app
  credentials: true, // Allows cookies and credentials
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"]
};

// Use the CORS middleware in your Express app
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Enable preflight requests for all routes

// Add CORS middleware to your Express app
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000"); // Specify the exact origin
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  // Pass to the next middleware
  next();
});




const router = express.Router();

const CLIENT_ID = process.env.CLIENT_ID; // Replace with your Google Client ID
const client = new OAuth2Client(CLIENT_ID);

let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;


// Configure its options
let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
jwtOptions.secretOrKey = process.env.JWT_SECRET;
jwtOptions.expiresIn = "24";

let strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {
  //console.log("payload received", jwt_payload);

  if (jwt_payload) {
    next(null, {
      _id: jwt_payload._id,
      userName: jwt_payload.userName,
    });
  } else {
    next(null, false);
  }
});

// tell passport to use our "strategy"
passport.use(strategy);
app.use(passport.initialize());

// Google OAuth Routes
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);


app.get('/', (req, res) => {
  res.send('Amirali Soltani');
});

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const payload = {
      _id: req.user._id,
      username: req.user.username,
      name: req.user.name,
      lastVisitedProducts: req.user.lastVisitedProducts,
      popularProducts: req.user.popularProducts,
      shoppingCart: req.user.shoppingCart,
      lastSearches: req.user.lastSearches || [],
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    const htmlResponse = `
      <script>
        // Send the token back to the parent window
        window.opener.postMessage({ token: "${token}" }, "*");
        // Close the popup window
        window.close();
      </script>
    `;

    res.send(htmlResponse);
  }
);


app.get("/login/success", (req, res) => {
  res.send("Login successful! Token: " + req.query.token);
});

mongoose.connect(process.env.MONGODB_URI);

app.use(cors());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// app.use(
//   session({
//     secret: "Our little secret.",
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: true,
//       sameSite: "none",
//     },
//   })
// );


app.use(
  session({
    secret: process.env.SESSION_SECRET || 'Our little secret.',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
    }),
    cookie: {
      secure: true, // Ensure this is false in development
      sameSite: "none",
    },
  })
);



passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:8080/auth/google/callback",
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        // Find or create the user in the database
        let user = await userService.findOrCreate({
          googleId: profile.id,
          username: profile.emails[0].value,
          name: profile.displayName,
        });

        // Now return the full user object, which includes shopping cart, last visited products, etc.
        const payload = {
          _id: user._id,
          username: user.username,
          name: user.name,
          lastName: user.lastName,
          lastVisitedProducts: user.lastVisitedProducts || [],
          popularProducts: user.popularProducts || [],
          shoppingCart: user.shoppingCart || [],
        };

        return done(null, payload);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);



app.post("/register", (req, res) => {
  console.log("hiiiiiiii");
  userService
    .registerUser(req.body)
    .then((user) => {
      let payload = {
        _id: user._id,
        username: user.username,
        name: user.name,
        lastName: user.lastName,
        lastVisitedProducts: user.lastVisitedProducts,
        popularProducts: user.popularProducts,
        shoppingCart: user.shoppingCart,
        lastSearches: [], // Make sure lastSearches is initialized
      };

      let token = jwt.sign(payload, jwtOptions.secretOrKey);
      console.log("yessssss");
      res.json({ message: "login successful", token: token, user: user });
    })
    .catch((msg) => {
      console.log("msg", msg);

      res.status(422).json({ message: msg });
    });
});

module.exports.findOrCreate = async function (userData) {
  try {
    let user = await User.findOne({ googleId: userData.googleId });
    
    if (!user) {
      user = new User({
        googleId: userData.googleId,
        username: userData.username,
        name: userData.name,
        lastVisitedProducts: [],
        popularProducts: [],
        shoppingCart: [],
      });

      await user.save();
    }

    return user;
  } catch (error) {
    throw new Error("Error while finding or creating user: " + error);
  }
};

app.post("/login", (req, res) => {
  userService
    .checkUser(req.body)
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
      console.log("byeeeeeee");

      res.status(422).json({ message: msg });
    });
});



app.put(
  "/shoppingCard",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const userId = req.user._id; // Get the user's ID from the authenticated user
    
    console.log("User ID:", userId); // Log the user ID
    console.log("Shopping Cart Data:", req.body); // Log the shopping cart data

    userService
      .addNewShoppingCart(userId, req.body)
      .then((data) => {
        console.log("Updated Shopping Cart:", data); // Log the updated shopping cart data
        res.json(data);
      })
      .catch((msg) => {
        console.error("Error:", msg); // Log any errors
        res.status(422).json({ error: msg });
      });
  }
);


app.get(
  "/favourites",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .getFavourites(req.user._id)
      .then((data) => {
        res.json(data);
      })
      .catch((msg) => {
        res.status(422).json({ error: msg });
      });
  }
);

app.put(
  "/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .addFavourite(req.user._id, req.params.id)
      .then((data) => {
        res.json(data);
      })
      .catch((msg) => {
        res.status(422).json({ error: msg });
      });
  }
);

app.delete(
  "/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .removeFavourite(req.user._id, req.params.id)
      .then((data) => {
        res.json(data);
      })
      .catch((msg) => {
        res.status(422).json({ error: msg });
      });
  }
);

app.get(
  "/lastVisited",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .getLastVisited(req.user._id)
      .then((data) => {
        res.json(data);
      })
      .catch((msg) => {
        res.status(422).json({ error: msg });
      });
  }
);

app.put(
  "/lastVisited/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    console.log("gereee")
    userService
      .addLastVisited(req.user._id, req.params.id)
      .then((data) => {
        res.json(data);
      })
      .catch((msg) => {
        res.status(422).json({ error: msg });
      });
  }
);

app.delete(
  "/lastVisited/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .removeLastVisited(req.user._id, req.params.id)
      .then((data) => {
        res.json(data);
      })
      .catch((msg) => {
        res.status(422).json({ error: msg });
      });
  }
);

app.put(
  "/replaceLastSearches",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const userId = req.user._id; // Get the user's ID from the authenticated user
    const newLastSearches = req.body; // Expect the entire list of new last searches in the request body

    userService
      .replaceLastSearches(userId, newLastSearches) // Call the service to replace the last searches
      .then((updatedSearches) => {
        res.json(updatedSearches); // Respond with the updated searches array
      })
      .catch((error) => {
        res.status(422).json({ error: error.message }); // Send error if something goes wrong
      });
  }
);

app.put(
  "/replaceLastVisited",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const userId = req.user._id; // Get the user's ID from the authenticated user
    const newLastVisitedProducts = req.body; // Expect the entire list of new last visited products in the request body

    userService
      .replaceLastVisitedProducts(userId, newLastVisitedProducts) // Call the service to replace last visited products
      .then((updatedVisited) => {
        res.json(updatedVisited); // Respond with the updated last visited products array
      })
      .catch((error) => {
        res.status(422).json({ error: error.message }); // Send error if something goes wrong
      });
  }
);






app.put(
  "/lastSearches",
  passport.authenticate("jwt", { session: false }), 
  (req, res) => {
    const userId = req.user._id; // Get the user's ID from the authenticated user
    const searchObject = req.body; // The search object being added

    userService
      .addLastSearch(userId, searchObject) // Calls the userService to handle the update
      .then((updatedSearches) => {
        res.json(updatedSearches); // Respond with the updated searches array
      })
      .catch((error) => {
        res.status(422).json({ error: error.message }); // Send error if something goes wrong
      });
  }
);


app.get(
  "/lastSearches",
  passport.authenticate("jwt", { session: false }), 
  (req, res) => {
    const userId = req.user._id; // Get the user's ID from the authenticated user

    userService
      .getLastSearches(userId) // Calls the userService to retrieve the last searches
      .then((lastSearches) => {
        res.json(lastSearches); // Respond with the user's last searches
      })
      .catch((error) => {
        res.status(422).json({ error: error.message }); // Send error if something goes wrong
      });
  }
);

app.delete(
  "/lastSearches",
  passport.authenticate("jwt", { session: false }), 
  (req, res) => {
    const userId = req.user._id; // Get the user's ID from the authenticated user

    userService
      .clearLastSearches(userId) // Calls the userService to clear last searches
      .then(() => {
        res.json({ message: "Last searches cleared successfully." }); // Respond with success message
      })
      .catch((error) => {
        res.status(422).json({ error: error.message }); // Send error if something goes wrong
      });
  }
);



userService
  .connect()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("API listening on: " + process.env.PORT);
    });
  })
  .catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
  });

// Register a new user and generate a JWT token
app.post("/register", async (req, res) => {
  const { username, password, name, lastName } = req.body;
  try {
    const newUser = new User({
      username: username,
      password: password,
      name: name,
      lastName: lastName,
      lastVisitedProducts: [],
      popularProducts: [],
      shoppingCart: [],
      lastSearches: [], // Add lastSearches field here
    });

    const user = await User.create(newUser); // Use await with create() to return a promise

    const token = jwt.sign({ id: user._id }, jwtOptions.secretOrKey, {
      expiresIn: jwtOptions.expiresIn,

    });

    res.status(200).json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login route and generate a JWT token
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  User.findOne({ username: username }, (err, user) => {
    if (err || !user) {
      res.status(401).json({ message: "Invalid username or password" });
    } else {
      user.comparePassword(password, (err, isMatch) => {
        if (err || !isMatch) {
          res.status(401).json({ message: "Invalid username or password" });
        } else {
          const token = jwt.sign({ id: user._id }, jwtOptions.secretOrKey, {
            expiresIn: jwtOptions.expiresIn,
          });
          res.status(200).json({ token });
        }
      });
    }
  });
});


module.exports = app;












