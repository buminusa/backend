const express = require("express");
const router = express.Router();
const usersControllers = require("../controllers/usersControllers");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

// get all users
router.get("/", authenticate, authorize("Super_Admin"), usersControllers.getAllUsers);

// get user by id
router.get("/:id", authenticate, authorize("Super_Admin"), usersControllers.getUserById);

// update user
router.put("/:id", authenticate, authorize("Super_Admin"), usersControllers.updateUser);

// delete user
router.delete("/:id", authenticate, authorize("Super_Admin"), usersControllers.deleteUser);

// assign role to user
router.patch("/:id/role", authenticate, authorize("Super_Admin"), usersControllers.assignRole);

// get user products by user id
router.get("/:id/products", authenticate, authorize("Super_Admin"), usersControllers.getUserProducts);
module.exports = router;
