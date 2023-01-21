const mongoose = require("mongoose");
const fileHelper = require("../util/file");

const { validationResult } = require("express-validator/check");


const Product = require("../models/product");

const failureHandler = (next, err) => {
  const error = new Error(err);
  error.httpStatusCode = 500;
  next(error); // the moment this next function is called it calls the special error middleware in app.js
};

exports.getAddProduct = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }

  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
    // isAuthenticated: req.session.isLoggedIn               // now incorporated in a middleware in app.js
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: "Attached File is not an image",
      validationErrors: [],
    });
  }
  console.log(image);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // this means that if there are errors then this if block will get executed.
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }
  const imageUrl = image.path;

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user,
  });
  product
    .save()
    .then((result) => {
      // console.log(result);
      console.log("Created Product");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      failureHandler(next, err); // for handling bigger problems like database offline or Network issues or something on those lines.
    }); // end of catch block
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
        //  isAuthenticated: req.session.isLoggedIn                    // now incorporated in a middleware in app.js
      });
    })
    .catch((err) => {
      failureHandler(next, err);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // this means that if there are errors then this if block will get executed.
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;

      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;             // the path of the newly selected image will be saved in database, deleting the path of older image. 
      }                                            // Deletion of path will also delete the path from the local storage (in this case from our images folder in this project)

      return product.save().then((result) => {
        console.log("UPDATED PRODUCT!");
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      failureHandler(next, err);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      console.log(products);
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
        // isAuthenticated: req.session.isLoggedIn                          // now incorporated in a middleware in app.js
      });
    })
    .catch((err) => {
      failureHandler(next, err);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId).then(product =>  {
    if(!product)
    {
      return next (new Error (" No product found !"));
    }
    fileHelper.deleteFile(product.imageUrl);                              // this will delete the image path from our file system storage and hence the image from our local folder storage (like here we used the images folder)
    return Product.deleteOne({ _id: prodId, userId: req.user._id });     // this will delete the entire product. 
  }).then(() => {
      console.log("DESTROYED PRODUCT");
      res.status(200).json({message:"Success"});
    }).catch((err) => {
      //failureHandler(next, err);
    res.status(500).json({message:"Deleting Product Failed"});
    });
};
