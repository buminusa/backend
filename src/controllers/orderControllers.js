const prisma = require("../config/prisma");
const generateOrderNumber = require("../utils/generateNumberOrders");
const { STATUS_FLOW, ROLE_ALLOWED_TRANSITIONS } = require("../utils/flowOders");

const orderIncludeDetail = {
    buyer: {
        select: { id: true, full_name: true, phone: true, province: true, country: true }
    },
    supplier: {
        select: { id: true, company_name: true, slug: true, logo_url: true }
    },
    orderItems: {
        include: {
            product: {
                select: { id: true, nama: true, slug: true, unit: true, images: { take: 1 } }
            }
        }
    }
};


// get all orders (admin)
const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, buyerId, supplierId, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {
            ...(status && { status }),
            ...(buyerId && { buyerId: Number(buyerId) }),
            ...(supplierId && { supplierId: Number(supplierId) }),
            ...(search && { order_number: { contains: search, mode: "insensitive" } })
        };

        const [orders, total] = await prisma.$transaction([
            prisma.orders.findMany({
                where,
                include: orderIncludeDetail,
                orderBy: { createdAt: "desc" },
                skip,
                take: Number(limit)
            }),
            prisma.orders.count({ where })
        ]);

        res.status(200).json({
            success: true,
            message: "Berhasil mengambil data order",
            data: orders,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// get order milik buyer yang login
const getMyOrdersBuyer = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const buyerProfile = await prisma.buyerProfiles.findUnique({
            where: { userId: req.user.id }
        });

        if (!buyerProfile) {
            return res.status(404).json({
                success: false,
                message: "Buyer profile tidak ditemukan"
            });
        }

        const where = {
            buyerId: buyerProfile.id,
            ...(status && { status })
        };

        const [orders, total] = await prisma.$transaction([
            prisma.orders.findMany({
                where,
                include: orderIncludeDetail,
                orderBy: { createdAt: "desc" },
                skip,
                take: Number(limit)
            }),
            prisma.orders.count({ where })
        ]);

        res.status(200).json({
            success: true,
            message: "Berhasil mengambil order buyer",
            data: orders,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// get order masuk ke supplier (company) yang login
const getMyOrdersSupplier = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const companyProfile = await prisma.companyProfiles.findUnique({
            where: { userId: req.user.id }
        });

        if (!companyProfile) {
            return res.status(404).json({
                success: false,
                message: "Company profile tidak ditemukan"
            });
        }

        const where = {
            supplierId: companyProfile.id,
            ...(status && { status })
        };

        const [orders, total] = await prisma.$transaction([
            prisma.orders.findMany({
                where,
                include: orderIncludeDetail,
                orderBy: { createdAt: "desc" },
                skip,
                take: Number(limit)
            }),
            prisma.orders.count({ where })
        ]);

        res.status(200).json({
            success: true,
            message: "Berhasil mengambil order supplier",
            data: orders,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// get detail order by id (dengan ownership check)
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await prisma.orders.findUnique({
            where: { id: Number(id) },
            include: orderIncludeDetail
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order tidak ditemukan"
            });
        }

        const roleName = req.user.role?.name_role;

        if (roleName === "Buyer") {
            const buyerProfile = await prisma.buyerProfiles.findUnique({ where: { userId: req.user.id } });
            if (!buyerProfile || order.buyerId !== buyerProfile.id) {
                return res.status(403).json({
                    success: false,
                    message: "Tidak memiliki akses ke order ini"
                });
            }
        }

        if (roleName === "Supplier") {
            const companyProfile = await prisma.companyProfiles.findUnique({ where: { userId: req.user.id } });
            if (!companyProfile || order.supplierId !== companyProfile.id) {
                return res.status(403).json({
                    success: false,
                    message: "Tidak memiliki akses ke order ini"
                });
            }
        }

        res.status(200).json({
            success: true,
            message: "Berhasil mengambil detail order",
            data: order
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


// buyer create order (1 order = 1 supplier)
const createOrder = async (req, res) => {
    try {
        const { items, shipping_address, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items order tidak boleh kosong"
            });
        };

        if (!shipping_address) {
            return res.status(400).json({
                success: false,
                message: "Shipping address wajib diisi"
            });
        };

        const buyerProfile = await prisma.buyerProfiles.findUnique({
            where: { userId: req.user.id }
        });

        if (!buyerProfile) {
            return res.status(404).json({
                success: false,
                message: "Buyer profile tidak ditemukan, lengkapi profile terlebih dahulu"
            });
        }

        const productIds = items.map((item) => Number(item.productId));
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } }
        });

        if (products.length !== productIds.length) {
            return res.status(404).json({
                success: false,
                message: "Terdapat product yang tidak ditemukan"
            });
        }

        const supplierIds = [...new Set(products.map((p) => p.supplierId))];
        if (supplierIds.length > 1) {
            return res.status(400).json({
                success: false,
                message: "Satu order hanya boleh berisi product dari satu supplier yang sama"
            });
        }

        const supplierId = supplierIds[0];

        const orderItemsData = [];

        for (const item of items) {
            const product = products.find((p) => p.id === Number(item.productId));
            const quantity = Number(item.quantity);

            if (!quantity || quantity < product.min_order) {
                return res.status(400).json({
                    success: false,
                    message: `Quantity product "${product.nama}" minimal ${product.min_order}`
                });
            }

            orderItemsData.push({
                productId: product.id,
                quantity
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.orders.create({
                data: {
                    buyerId: buyerProfile.id,
                    supplierId: supplierId,
                    order_number: generateOrderNumber(),
                    status: "Pending",
                    total_amount: 0,
                    shipping_address: shipping_address,
                    notes: notes || null,
                    orderItems: {
                        create: orderItemsData
                    }
                },
                include: orderIncludeDetail
            });

            return order;
        });

        res.status(201).json({
            success: true,
            message: "Order berhasil dibuat",
            data: result
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


// supplier / admin update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !STATUS_FLOW[status]) {
            return res.status(400).json({
                success: false,
                message: "Status tidak valid"
            });
        };

        const order = await prisma.orders.findUnique({
            where: { id: Number(id) }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order tidak ditemukan"
            });
        }

        const roleName = req.user.role?.name_role;

        if (roleName === "Supplier") {
            const companyProfile = await prisma.companyProfiles.findUnique({ where: { userId: req.user.id } });
            if (!companyProfile || order.supplierId !== companyProfile.id) {
                return res.status(403).json({
                    success: false,
                    message: "Tidak memiliki akses ke order ini"
                });
            }
        }

        const allowedByRole = ROLE_ALLOWED_TRANSITIONS[roleName] || {};
        const allowedTargets = allowedByRole[order.status] || [];

        if (!allowedTargets.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Role "${roleName}" tidak diizinkan mengubah status dari "${order.status}" ke "${status}"`
            });
        }

        const updatedOrder = await prisma.orders.update({
            where: { id: Number(id) },
            data: { status: status },
            include: orderIncludeDetail
        });

        res.status(200).json({
            success: true,
            message: `Status order berhasil diubah menjadi "${status}"`,
            data: updatedOrder
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// cancel order (buyer only)
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const buyerProfile = await prisma.buyerProfiles.findUnique({
            where: { userId: req.user.id }
        });

        if (!buyerProfile) {
            return res.status(404).json({
                success: false,
                message: "Buyer profile tidak ditemukan"
            });
        }

        const order = await prisma.orders.findUnique({
            where: { id: Number(id) }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order tidak ditemukan"
            });
        }

        if (order.buyerId !== buyerProfile.id) {
            return res.status(403).json({
                success: false,
                message: "Tidak memiliki akses ke order ini"
            });
        }

        const allowedTargets = ROLE_ALLOWED_TRANSITIONS.Buyer[order.status] || [];
        if (!allowedTargets.includes("Cancelled")) {
            return res.status(400).json({
                success: false,
                message: `Order dengan status "${order.status}" tidak bisa dibatalkan`
            });
        }

        const cancelledOrder = await prisma.orders.update({
            where: { id: Number(id) },
            data: { status: "Cancelled" },
            include: orderIncludeDetail
        });

        res.status(200).json({
            success: true,
            message: "Order berhasil dibatalkan",
            data: cancelledOrder
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


// delete order (hard delete, admin only)
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await prisma.orders.findUnique({
            where: { id: Number(id) }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order tidak ditemukan"
            });
        }

        await prisma.$transaction([
            prisma.orderItems.deleteMany({ where: { orderId: Number(id) } }),
            prisma.orders.delete({ where: { id: Number(id) } })
        ]);

        res.status(200).json({
            success: true,
            message: "Order berhasil dihapus"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


module.exports = {
    getAllOrders,
    getMyOrdersBuyer,
    getMyOrdersSupplier,
    getOrderById,
    createOrder,
    updateOrderStatus,
    cancelOrder,
    deleteOrder
};