const { check, body } = require("express-validator");

module.exports = [
  check("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .custom((value, { req }) => {
      if (value === "rocky@rocky.com") {                                       // blocking a particular user.
        throw new Error("This email is forbidden");
      }
      return true;
    }),
  body(
    "password",
    "Please enter a password with only numbers and text at least 5 characters long"
  )
    .isLength({ min: 5 })
    .isAlphanumeric(),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords have to match !");
    }
    return true;
  }),
  (req, res, next) => {
    next();
  }
];
