const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const {validationResult} = require("express-validator");

const nodemailer = require("nodemailer");
const sendinblueTransport = require("nodemailer-sendinblue-transport");



const User = require("../models/user");


const transporter = nodemailer.createTransport(
  new sendinblueTransport({
    apiKey:
      "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",
  })
);

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");        // message will be an array, this is coz of behaviour of flash()
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Your LogIn Page",
    //  isAuthenticated: false,               // now incorporated in a middleware in app.js
    errorMessage: message,
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error"); // message will be an array, this is coz of behaviour of flash()
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    //  isAuthenticated: false,                // now incorporated in a middleware in app.js
 oldInput:{
  email:"",
  password:"",
  confirmPassword:"",
 }
 
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if(!errors.isEmpty())
  {
    return res.render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        // if user, doesn't exist in database, then redirected back to login form page
        req.flash("error", "Invalid email or password");
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            // doMatch is true when passwords match
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          req.flash("error", "Invalid email or password");
          res.redirect("/login"); // if doMatch is false then we will get here and redirected back to login page
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors =  validationResult(req);           // errors will be an object
  if(!errors.isEmpty())                           // if the errors object is not empty then this if block will execute and we will see an error message due to validation fail 
  {
    console.log(errors.array());
    //console.log(errors);
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {email:email, password:password, confirmPassword: req.body.confirmPassword}
    })
  }

  // User.findOne({ email: email })             // now this is being done in routes
  //   .then((userDoc) => {
  //     if (userDoc) {
  //       // if userDoc exists then this means that the email trying to signup is already present in our database, and it is not a new user, so we can't take his sign up again to avoid duplicaton in our database.

  //       req.flash("error", "Email already exists, please pick a different one");
  //       return res.redirect("/signup");
  //     }
       bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
          });
          return user.save();
        })
        .then((result) => {
          res.redirect("/login");
          return transporter.sendMail({
            to: email,
            from: "electronicshop@nodeproject.com",
            subject: "Signup successful",
            html: "<h1> You successfully signed up </h1><br><h3> Happy shopping and get latest deals on all our products</h3>",
          });
        }).catch((err) => {
          console.log(err);
        })
      }
      
exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error"); // message will be an array, this is coz of behaviour of flash()
 
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Your Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email found.");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000; // token expires in 1 hour, 3600000 signifies milisecs for 1 hr
        return user.save();
      })
      .then((result) => {
        res.redirect("/");
        transporter.sendMail({
          to: req.body.email,
          from: "electronicshop@nodeproject.com",
          subject: "Password Reset",
          html: `<p>You requested a Password Reset</p>
                      <p>Click this <a href ="http://localhost:3000/reset/${token}">link</a> to set a new password </p>`,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;

  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token,                                 // passwordToken is set equal to the token present in url (mention in link in reset mail)
      });
    })
    .catch((err) => console.log(err));
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  }).then( user => {
      resetUser = user; 
      return bcrypt.hash(newPassword, 12)
    }).then( hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    }).then(result => {
    return  res.redirect('/login');
    })
    .catch(err => console.log(err));
};