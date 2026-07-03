const express = require("express");
const router = express.Router();
const productController = require("../controllers/productControllers");
const { authenticate, authorize } = require("../middlewares/authMiddleware");
const { handleUploadError } = require("../middlewares/uploadMiddleware");
const { uploadProduct } = require("../config/cloudinary");


router.get("/", authenticate, productController.getAllProducts);
router.get("/slug/:slug", authenticate, productController.getProductBySlug);
router.get("/popular", authenticate, productController.getPopularProducts);
router.get("/:id", authenticate, productController.getProductById);

// crate product
router.post(
  "/",
  authenticate,
  authorize("Supplier"),
  uploadProduct.array("images", 5),
  handleUploadError,
  productController.createProduct
);

// update product
router.put(
  "/:id",
  authenticate,
  authorize("Supplier"),
  uploadProduct.array("images", 5),
  handleUploadError,
  productController.updateProduct
);

// update product status (admin only)
router.patch(
  "/:id/status",
  authenticate,
  authorize("Admin"),
  productController.updateProductStatus
);

// delete product
router.delete("/:id", authenticate, authorize("Supplier", "Super_Admin"), productController.deleteProduct);

// delete image product
router.delete(
  "/images/:imageId",
  authenticate,
  authorize("Supplier"),
  productController.deleteProductImage
);

module.exports = router;