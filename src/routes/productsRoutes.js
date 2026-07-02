const express = require("express");
const router = express.Router();
const productController = require("../controllers/productControllers");
const { authenticate, authorize  } = require("../middlewares/authMiddleware");
const { handleUploadError } = require("../middlewares/uploadMiddleware");
const { uploadProduct } = require("../config/cloudinary");

router.get("/", authenticate, productController.getAllProducts);
router.get("/:id", authenticate, productController.getProductById);
router.post(
  "/",
  authenticate,
  authorize("Supplier"),
  uploadProduct.array("images", 5),
  handleUploadError,
  productController.createProduct
);
router.put(
  "/:id",
  authenticate,
  authorize("Supplier"),
  uploadProduct.array("images", 5),
  handleUploadError,
  productController.updateProduct
);
router.delete("/:id", authenticate, authorize("Supplier", "Super_Admin"), productController.deleteProduct);

module.exports = router;
