const express = require("express");
const router = express.Router();
const categoriesControllers = require("../controllers/categoriesControllers");

router.get("/", categoriesControllers.getAllCategories);
router.get("/:id", categoriesControllers.getCategoryById);
router.post("/", categoriesControllers.createCategory);
router.put("/:id", categoriesControllers.updateCategory);
router.delete("/:id", categoriesControllers.deleteCategory);

module.exports = router;
