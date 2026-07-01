const express = require("express");
const router = express.Router();
const companyProfileControllers = require("../controllers/companyProfileConrtrollers");
const { authenticate, authorize } = require("../middlewares/authMiddleware");
const { uploadLogo } = require("../config/cloudinary"); 

// get all company profiles
router.get("/", authorize("ADMIN"), companyProfileControllers.getAllCompanyProfiles);

// get company profile by user id
router.get("/:id", authenticate, companyProfileControllers.getCompanyProfile);

// update company profile by user id
router.put("/:id", authenticate, companyProfileControllers.updateCompanyProfile);

// update logo by user id
router.put("/:id/logo", authenticate, uploadLogo.single("logo"), companyProfileControllers.updateLogo);

// update verification status (admin only)
router.patch("/:id/verification-status", authenticate, authorize("ADMIN"), companyProfileControllers.updateVerificationStatus);

module.exports = router;