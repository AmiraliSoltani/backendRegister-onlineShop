const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

let mongoDBConnectionString = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  lastName: String,
  googleId: String, // Used for Google OAuth sign-in
  lastVisitedProducts: [Number], // Keeping the last visited product IDs
  popularProducts: [Number], // Keeping the popular product IDs
  lastSearches:[
    {
      brandName: String,
      categoryID: Number,
      combo: String,
      description: String,
      mainWord: String,
      path: String,
      term: String,
    },
  ],
  shoppingCart: [
    {
      product: {
        _id: Number, // Store the product ID
        title: String,
        title_En: String,
        price: Number,
        off: String,
        offerTime: Date,
        categoryId: Number,
        categoryAttributes: [mongoose.Schema.Types.Mixed], // Flexible to store varied attributes
        guarantee: {
          hasGuarantee: Boolean,
          guranteeName: String,
        },
        productPic: mongoose.Schema.Types.Mixed, // Could be an array or object of pictures
        vote: Number,
        visited: Number,
        sold: Number,
      },
      color: [String],
      size: String,
      count: { type: Number, required: true },
      maxCount: { type: Number, required: true },
    },
  ],
});

let User = new mongoose.model("User", userSchema);

module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString);

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

// Register a user with username and password (regular sign-up)
module.exports.registerUser = function (userData) {
  return new Promise(function (resolve, reject) {
    bcrypt
      .hash(userData.password, 10)
      .then((hash) => {
        userData.password = hash;

        const { username, password, name, lastName } = userData;
        const newUser = new User({
          username: username,
          password: password,
          name: name,
          lastName: lastName,
          lastVisitedProducts: [],
          popularProducts: [],
          shoppingCart: [],
        });

        return newUser.save();
      })
      .then((user) => {
        resolve(user);
      })
      .catch((err) => {
        if (err.code === 11000) {
          reject("Username already taken");
        } else {
          reject("There was an error creating the user: " + err);
        }
      });
  });
};

// Check user's credentials (regular sign-in)
module.exports.checkUser = function (userData) {
  return new Promise(function (resolve, reject) {
    User.findOne({ username: userData.username })
      .exec()
      .then((user) => {
        if (!user) {
          return reject("Unable to find user " + userData.username);
        }
        bcrypt.compare(userData.password, user.password).then((res) => {
          if (res === true) {
            resolve(user);
          } else {
            reject("Incorrect password for user " + userData.username);
          }
        });
      })
      .catch((err) => {
        reject("Unable to find user " + userData.username);
      });
  });
};

module.exports.addLastSearch = function (userId, searchObject) {
  return new Promise((resolve, reject) => {
    User.findById(userId)
      .exec()
      .then((user) => {
        if (!user) {
          return reject("User not found");
        }

        // Ensure lastSearches array exists
        if (!user.lastSearches) {
          user.lastSearches = [];
        }

        // // Check if the search with the same mainWord already exists
        // const searchExists = user.lastSearches.some(
        //   (search) => search.mainWord === searchObject.mainWord
        // );
        // if (searchExists) {
        //   return reject("Search with the same mainWord already exists.");
        // }

        user.lastSearches = user.lastSearches.filter(
          (item) => item.mainWord != searchObject.mainWord
        );


        // Add the new searchObject to the beginning of the array
        user.lastSearches.unshift(searchObject);

        // Limit the array to 1000 items
        if (user.lastSearches.length > 1000) {
          user.lastSearches = user.lastSearches.slice(0, 1000);
        }

        // Save the user with the updated lastSearches
        user
          .save()
          .then((updatedUser) => {
            resolve(updatedUser.lastSearches); // Return the updated lastSearches array
          })
          .catch((error) => {
            reject("Error saving the last searches: " + error);
          });
      })
      .catch((error) => {
        reject("Error finding the user: " + error);
      });
  });
};


module.exports.replaceLastSearches = function (userId, newLastSearches) {
  return new Promise((resolve, reject) => {
    User.findById(userId)
      .exec()
      .then((user) => {
        if (!user) {
          return reject("User not found");
        }

        // Replace the user's last searches with the new array
        user.lastSearches = newLastSearches;

        // Limit the array to 1000 items if necessary
        if (user.lastSearches.length > 1000) {
          user.lastSearches = user.lastSearches.slice(0, 1000);
        }

        // Save the user with the updated last searches
        user
          .save()
          .then((updatedUser) => {
            resolve(updatedUser.lastSearches); // Return the updated last searches array
          })
          .catch((error) => {
            reject("Error saving the last searches: " + error);
          });
      })
      .catch((error) => {
        reject("Error finding the user: " + error);
      });
  });
};

module.exports.replaceLastVisitedProducts = function (userId, newLastVisitedProducts) {
  return new Promise((resolve, reject) => {
    User.findById(userId)
      .exec()
      .then((user) => {
        if (!user) {
          return reject("User not found");
        }

        // Replace the user's last visited products with the new array
        user.lastVisitedProducts = newLastVisitedProducts;

        // Limit the array to 500 items if necessary
        if (user.lastVisitedProducts.length > 500) {
          user.lastVisitedProducts = user.lastVisitedProducts.slice(0, 500);
        }

        // Save the user with the updated last visited products
        user
          .save()
          .then((updatedUser) => {
            resolve(updatedUser.lastVisitedProducts); // Return the updated last visited products array
          })
          .catch((error) => {
            reject("Error saving the last visited products: " + error);
          });
      })
      .catch((error) => {
        reject("Error finding the user: " + error);
      });
  });
};


module.exports.getLastSearches = function (userId) {
  return new Promise((resolve, reject) => {
    User.findById(userId)
      .select("lastSearches") // Fetch only the lastSearches field
      .exec()
      .then((user) => {
        if (!user) {
          return reject("User not found");
        }

        resolve(user.lastSearches); // Return the lastSearches array
      })
      .catch((error) => {
        reject("Error fetching last searches: " + error);
      });
  });
};

module.exports.clearLastSearches = function (userId) {
  return new Promise((resolve, reject) => {
    User.findById(userId)
      .exec()
      .then((user) => {
        if (!user) {
          return reject("User not found");
        }

        // Clear the lastSearches array
        user.lastSearches = [];

        // Save the user with the cleared lastSearches array
        user
          .save()
          .then(() => {
            resolve(); // Resolve when saved successfully
          })
          .catch((error) => {
            reject("Error clearing last searches: " + error);
          });
      })
      .catch((error) => {
        reject("Error finding the user: " + error);
      });
  });
};


// Find or create a user based on Google ID (for Google OAuth)
module.exports.findOrCreate = async function (profile) {
  try {
    let user = await User.findOne({ googleId: profile.googleId });

    if (!user) {
      user = new User({
        googleId: profile.googleId,
        username: profile.username, // Email as username for Google accounts
        name: profile.name,
        lastVisitedProducts: [],
        popularProducts: [],
        shoppingCart: [],
      });

      await user.save();
    }

    return user;
  } catch (error) {
    throw new Error("Error while adding/finding user with Google OAuth");
  }
};

// Shopping cart and favorites functions
module.exports.getShoppingCart = function (id) {
  return new Promise(function (resolve, reject) {
    User.findById(id)
      .exec()
      .then((user) => {
        resolve(user.shoppingCart);
      })
      .catch((err) => {
        reject(`Unable to get shoppingCart for user with id: ${id}`);
      });
  });
};

module.exports.addNewShoppingCart = function (id, newShoppingCart) {
  return new Promise(function (resolve, reject) {
    User.findOneAndUpdate(
      { _id: id },
      { $set: { shoppingCart: newShoppingCart } },
      { new: true, useFindAndModify: false }
    )
      .exec()
      .then((updatedUser) => {
        if (!updatedUser) {
          return reject(`User with id: ${id} not found`);
        }
        resolve(updatedUser.shoppingCart);
      })
      .catch((err) => {
        reject(`Unable to update shopping cart for user with id: ${id}`);
      });
  });
};

// Rest of your existing methods (favourites, lastVisited, etc.) are unchanged
module.exports.getFavourites = function (id) {
  return new Promise(function (resolve, reject) {
    User.findById(id)
      .exec()
      .then((user) => {
        resolve(user.popularProducts);
      })
      .catch((err) => {
        reject(`Unable to get favourites for user with id: ${id}`);
      });
  });
};

module.exports.addFavourite = function (id, favId) {
  return new Promise(function (resolve, reject) {
    User.findById(id)
      .exec()
      .then((user) => {
        const favIndex = user.popularProducts.indexOf(favId);

        if (favIndex !== -1) {
          user.popularProducts.splice(favIndex, 1);
        }

        if (user.popularProducts.length < 500) {
          user.popularProducts.push(favId);

          user
            .save()
            .then((updatedUser) => {
              resolve(updatedUser.popularProducts);
            })
            .catch((err) => {
              reject(
                `Unable to update popular products for user with id: ${id}`
              );
            });
        } else {
          reject(`Unable to update popular products for user with id: ${id}`);
        }
      })
      .catch((err) => {
        reject(`Error finding user with id: ${id}`);
      });
  });
};

module.exports.removeFavourite = function (id, favId) {
  return new Promise(function (resolve, reject) {
    User.findByIdAndUpdate(
      id,
      { $pull: { popularProducts: favId } },
      { new: true }
    )
      .exec()
      .then((user) => {
        resolve(user.popularProducts);
      })
      .catch((err) => {
        reject(`Unable to update favourites for user with id: ${id}`);
      });
  });
};

module.exports.getLastVisited = function (id) {
  return new Promise(function (resolve, reject) {
    User.findById(id)
      .exec()
      .then((user) => {
        resolve(user.lastVisitedProducts);
      })
      .catch((err) => {
        reject(`Unable to get last visited products for user with id: ${id}`);
      });
  });
};

module.exports.addLastVisited = function (id, favId) {
  console.log("visited ," ,favId)
  return new Promise(function (resolve, reject) {
    User.findById(id)
      .exec()
      .then((user) => {
        // Ensure the lastVisitedProducts array exists
        if (!user.lastVisitedProducts) {
          user.lastVisitedProducts = [];
        }

        // Check if favId already exists in the array
          // If it exists, remove it
          user.lastVisitedProducts = user.lastVisitedProducts.filter(
            (item) => item != favId
          );
     

        // Add favId to the beginning of the array
        user.lastVisitedProducts.unshift(favId);

        // Limit the array to 500 items
        if (user.lastVisitedProducts.length > 500) {
          user.lastVisitedProducts = user.lastVisitedProducts.slice(0, 500);
        }

        user
          .save()
          .then((updatedUser) => {
            resolve(updatedUser.lastVisitedProducts);
          })
          .catch((err) => {
            reject(
              `Unable to update last visited products for user with id: ${id}`
            );
          });
      })
      .catch((err) => {
        reject(`Error finding user with id: ${id}`);
      });
  });
};

module.exports.removeLastVisited = function (id, favId) {
  return new Promise(function (resolve, reject) {
    User.findByIdAndUpdate(
      id,
      { $pull: { lastVisitedProducts: favId } },
      { new: true }
    )
      .exec()
      .then((user) => {
        resolve(user.lastVisitedProducts);
      })
      .catch((err) => {
        reject(`Unable to update last visited products for user with id: ${id}`);
      });
  });
};

module.exports.getHistory = function (id) {
  return new Promise(function (resolve, reject) {
    User.findById(id)
      .exec()
      .then((user) => {
        resolve(user.history);
      })
      .catch((err) => {
        reject(`Unable to get history for user with id: ${id}`);
      });
  });
};

module.exports.addHistory = function (id, historyId) {
  return new Promise(function (resolve, reject) {
    User.findById(id)
      .exec()
      .then((user) => {
        if (user.history.length < 50) {
          User.findByIdAndUpdate(
            id,
            { $addToSet: { history: historyId } },
            { new: true }
          )
            .exec()
            .then((user) => {
              resolve(user.history);
            })
            .catch((err) => {
              reject(`Unable to update history for user with id: ${id}`);
            });
        } else {
          reject(`Unable to update history for user with id: ${id}`);
        }
      });
  });
};

module.exports.removeHistory = function (id, historyId) {
  return new Promise(function (resolve, reject) {
    User.findByIdAndUpdate(id, { $pull: { history: historyId } }, { new: true })
      .exec()
      .then((user) => {
        resolve(user.history);
      })
      .catch((err) => {
        reject(`Unable to update history for user with id: ${id}`);
      });
  });
};
















