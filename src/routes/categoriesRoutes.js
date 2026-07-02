const express = require("express");
const router = express.Router();
const categoriesControllers = require("../controllers/categoriesControllers");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

router.get("/", categoriesControllers.getAllCategories);
router.get("/slug/:slug", categoriesControllers.getCategoryBySlug);
router.get("/:id", categoriesControllers.getCategoryById);
router.post("/", categoriesControllers.createCategory);
router.put("/:id", categoriesControllers.updateCategory);
router.delete("/:id", categoriesControllers.deleteCategory);

module.exports = router;
