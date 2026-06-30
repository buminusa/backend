const express = require("express");
const router = express.Router();
const usersControllers = require("../controllers/usersControllers");

// get all users
router.get("/", usersControllers.getAllUsers);

// get user by id
router.get("/:id", usersControllers.getUserById);

// update user
router.put("/:id", usersControllers.updateUser);

// delete user
router.delete("/:id", usersControllers.deleteUser);

// assign role to user
router.patch("/:id/role", usersControllers.assignRole);

// get user products by user id
router.get("/:id/products", usersControllers.getUserProducts);
module.exports = router;
