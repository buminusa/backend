const express = require("express");
const router = express.Router();
const companyProfileControllers = require("../controllers/companyProfileConrtrollers");
const { authenticate, authorize } = require("../middlewares/authMiddleware");
const { uploadLogo } = require("../config/cloudinary"); 

// get all company profiles
router.get("/",authenticate, authorize("Admin", "Super_Admin"), companyProfileControllers.getAllCompanyProfiles);

// get company profile by user id
router.get("/:id", authenticate, companyProfileControllers.getCompanyProfile);

// update company profile by user id
router.put("/:id", authenticate, authorize("Supplier"), companyProfileControllers.updateCompanyProfile);

// update logo by user id
router.put("/:id/logo", authenticate, authorize("Supplier"), uploadLogo.single("logo"), companyProfileControllers.updateLogo);

// update verification status (admin only)
router.patch("/:id/verification-status", authenticate, authorize("Admin", "Super_Admin"), companyProfileControllers.updateVerificationStatus);

module.exports = router;