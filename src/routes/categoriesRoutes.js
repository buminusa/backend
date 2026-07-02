const express = require("express");
const router = express.Router();
const categoriesControllers = require("../controllers/categoriesControllers");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

router.get("/", authenticate, categoriesControllers.getAllCategories);
router.get("/:id", authenticate, categoriesControllers.getCategoryById);
router.post("/", authenticate, authorize("Super_Admin"), categoriesControllers.createCategory);
router.put("/:id", authenticate, authorize("Super_Admin"), categoriesControllers.updateCategory);
router.delete("/:id", authenticate, authorize("Super_Admin"), categoriesControllers.deleteCategory);

module.exports = router;
