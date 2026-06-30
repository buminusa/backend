const express = require("express");
const router = express.Router();
const productController = require("../controllers/productControllers");
const { authenticate } = require("../middlewares/authMiddleware");
const { handleUploadError } = require("../middlewares/uploadMiddleware");
const { uploadProduct } = require("../config/cloudinary");

router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.post(
  "/",
  authenticate,
  uploadProduct.array("images", 5),
  handleUploadError,
  productController.createProduct
);
router.put(
  "/:id",
  authenticate,
  uploadProduct.array("images", 5),
  handleUploadError,
  productController.updateProduct
);
router.delete("/:id", authenticate, productController.deleteProduct);

module.exports = router;
