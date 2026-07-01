const express = require("express");
const router = express.Router();
const buyerControllers = require("../controllers/buyerControllers");
const { authenticate } = require("../middlewares/authMiddleware");

router.get("/", buyerControllers.getAllBuyerProfiles);
router.get("/:id", authenticate, buyerControllers.getBuyerProfile);
router.put("/:id", authenticate, buyerControllers.updateBuyerProfile);

module.exports = router;
