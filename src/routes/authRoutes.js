const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authControllers");
const { authenticate } = require("../middlewares/authMiddleware");
const { handleUploadError } = require("../middlewares/uploadMiddleware");
const { uploadRegister } = require("../config/cloudinary");

// rate limiter khusus login: 5 percobaan per 15 menit per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." }
});

// rate limiter khusus forgot password: 3 percobaan per 15 menit per IP
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Terlalu banyak permintaan reset password. Coba lagi dalam 15 menit." }
});


// register for company
router.post("/register-company", uploadRegister.fields([{ name: "npwp", maxCount: 1 }, { name: "logo", maxCount: 1 }]), handleUploadError, authController.registerCompany);

// register for buyer
router.post("/register-buyer", authController.registerBuyer);

// login
router.post("/login", loginLimiter, authController.login);

// verifikasi email via link yang dikirim dari email
router.get("/verify-email", authController.verifyEmail);

// lupa password
router.post("/forgot-password", forgotPasswordLimiter, authController.forgotPassword);

// reset password pakai token dari email
router.post("/reset-password", authController.resetPassword);

router.post("/logout", authenticate, authController.logout);

router.get("/me", authenticate, authController.me);

module.exports = router;
