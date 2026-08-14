const express = require("express");
const router = express.Router();
const categoriesControllers = require("../controllers/categoriesControllers");
const { uploadCategory } = require("../config/cloudinary");
const { handleUploadError } = require("../middlewares/uploadMiddleware");

router.get("/", categoriesControllers.getAllCategories);
router.get("/slug/:slug", categoriesControllers.getCategoryBySlug);
router.get("/:id", categoriesControllers.getCategoryById);
router.post("/", uploadCategory.single("image"), handleUploadError, categoriesControllers.createCategory);
router.put("/:id", uploadCategory.single("image"), handleUploadError, categoriesControllers.updateCategory);
router.delete("/:id", categoriesControllers.deleteCategory);

module.exports = router;
