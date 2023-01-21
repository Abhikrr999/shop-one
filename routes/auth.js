const express = require("express");
const { check, body } = require("express-validator");
const User = require("../models/user");
const authController = require("../controllers/auth");
//const validchek = require('../middleware/validchek');                      // use this if you want to use your customised middleware
const router = express.Router();

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid Email address")
      .normalizeEmail(),
    body("password", "Password is not valid")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);

router.post(
  "/signup",
  check("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .custom((value, { req }) => {
      // if (value === "rocky@rocky.com") {
      //   // custom validator made by us to block a particular email from signing up
      //   throw new Error("This email is forbidden");
      // }
      // return true;
      return User.findOne({ email: value }).then((userDoc) => {
        if (userDoc) {
          return Promise.reject(
            "Email already exists, please pick a different one"
          );
        }
      });
    })
    .normalizeEmail(),

  body(
    "password",
    "Please enter a password with only numbers and text at least 5 characters long"
  )
    .isLength({ min: 5 })
    .isAlphanumeric()
    .trim(),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords have to match !");
    }
    return true;
  }),
  authController.postSignup
);

//router.post("/signup", validchek, authController.postSignup);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
