const path = require("path");
require('dotenv').config(); 
const fs = require('fs');
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session"); // package to manage session
const MongoDBStore = require("connect-mongodb-session")(session); // package to store the sessions in mongodb
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require("helmet");
const compression = require('compression');
const morgan = require('morgan');

const errorController = require("./controllers/error");
const User = require("./models/user");


const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@section20shop.c57necz.mongodb.net/shop?retryWrites=true&w=majority`;

const app = express();


const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination : (req, file, cb) => {
    cb(null, 'images');
  } ,
  filename: (req, file, cb) => {
cb(null, Date.now() + '-' + file.originalname);
  }
})

const fileFilter =(req, file, cb) => {
if(file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg"){
  cb (null, true);              // only the above types of file formats can be uploaded
}
  else {
    cb(null, false);       
  }
}; 



app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags : 'a'});

app.use(helmet());
app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, "images")));

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(csrfProtection); // remember to place this middleware below your bodyparser and session middleware, otherwise you will get errors
app.use(flash());

app.use((req, res, next) => {
  // middleware that will check csrf tokens for all requests, and matches them with responses to ensure no csrf attack takes place
  res.locals.isAuthenticated = req.session.isLoggedIn;

  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {

  //throw new Error("Some random shit");           //  INTENTIONALLY thrown error to check our error handling capability

  if (!req.session.user) {
    // if no session is found, then exit the middleware, and go to the next middleware
    return next();
  }
  res.locals.email = req.session.user.email;     // making the loggedin user email available in session object also available to ejs file so that it can be displayed in navigation bar.

  User.findById(req.session.user._id)           // you find the user and you store his details in the request
     .then((user) => {
    // throw new Error("Some random shit");      // INTENTIONALLY thrown error to check our error handling capability   
      req.user = user;
      next();
    })
    .catch((err) => {
      next (new Error(err));
    });
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {                               // a special middleware that handles errors
//  res.redirect("/500");
  res.status(500).render("500", {
    pageTitle: "Error",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn
  });
});


mongoose
  .connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  )
  .then((result) => {
    app.listen(3000);
  }
  )
  .catch((err) => {
   console.log(err);
  });

  module.exports = app;