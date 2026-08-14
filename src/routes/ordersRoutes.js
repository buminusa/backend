const express = require("express");
const router = express.Router();
const orderControllers = require("../controllers/orderControllers");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

// get all orders (admin)
router.get("/", authenticate, authorize("Admin", "Super_Admin"), orderControllers.getAllOrders);

// get order milik buyer yang login
router.get("/buyer/my-orders", authenticate, authorize("Buyer"), orderControllers.getMyOrdersBuyer);

// get order masuk ke supplier yang login
router.get("/supplier/my-orders", authenticate, authorize("Supplier"), orderControllers.getMyOrdersSupplier);

// get detail order by id
router.get("/:id", authenticate, authorize("Buyer", "Supplier", "Admin", "Super_Admin"), orderControllers.getOrderById);

// buyer create order
router.post("/", authenticate, authorize("Buyer"), orderControllers.createOrder);

// supplier/admin/super_admin update status order
router.patch("/:id/status", authenticate, authorize("Supplier", "Admin", "Super_Admin"), orderControllers.updateOrderStatus);

// buyer cancel order milik sendiri
router.patch("/:id/cancel", authenticate, authorize("Buyer"), orderControllers.cancelOrder);

// admin hapus order permanen
router.delete("/:id", authenticate, authorize("Admin", "Super_Admin"), orderControllers.deleteOrder);

module.exports = router;