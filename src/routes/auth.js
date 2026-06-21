const express = require("express");
const router = express.Router();
const authController = require("../controllers/authControllers");
const { authenticate } = require("../middlewares/authMiddleware");
const { handleUploadError } = require("../middlewares/uploadMiddleware");
const { uploadRegister } = require("../config/cloudinary");


// register for company
router.post("/register-company", uploadRegister.fields([{ name: "npwp", maxCount: 1 }, { name: "logo", maxCount: 1 }]), handleUploadError, authController.registerCompany);

// login
router.post("/login", authController.login);
module.exports = router;
