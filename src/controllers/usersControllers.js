const prisma = require("../config/prisma");

// get all users
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            prisma.users.findMany({
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: "desc" },
                include: {
                    role: true,
                    buyerProfiles: true,
                    companyProfiles: {
                        select: {
                            id: true,
                            company_name: true,
                            slug: true,
                            province: true,
                            country: true,
                            phone: true,
                            logo_url: true,
                            verificationStatus: true,
                        },
                    },
                },
            }),
            prisma.users.count(),
        ]);

        const sanitized = users.map(({ password, ...rest }) => rest);

        return res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            data: sanitized,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// get user by id
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.users.findUnique({
            where: { id: parseInt(id) },
            include: {
                role: true,
                buyerProfiles: true,
                companyProfiles: {
                    select: {
                        id: true,
                        company_name: true,
                        slug: true,
                        address: true,
                        province: true,
                        country: true,
                        phone: true,
                        logo_url: true,
                        business_description: true,
                        verificationStatus: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const { password, ...sanitized } = user;

        return res.status(200).json({
            success: true,
            message: "User retrieved successfully",
            data: sanitized,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// update user 
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, roleId } = req.body;

        const existing = await prisma.users.findUnique({
            where: { id: parseInt(id) },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (email && email !== existing.email) {
            const emailTaken = await prisma.users.findUnique({ where: { email } });
            if (emailTaken) {
                return res.status(409).json({
                    success: false,
                    message: "Email already in use",
                });
            }
        }

        const updated = await prisma.users.update({
            where: { id: parseInt(id) },
            data: {
                ...(email && { email }),
                ...(roleId !== undefined && { roleId: parseInt(roleId) }),
            },
            select: {
                id: true,
                email: true,
                roleId: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: updated,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.users.findUnique({
            where: { id: parseInt(id) },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        await prisma.users.delete({ where: { id: parseInt(id) } });

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// assign role
const assignRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId } = req.body;

        if (!roleId) {
            return res.status(400).json({
                success: false,
                message: "roleId is required",
            });
        }

        const [user, role] = await Promise.all([
            prisma.users.findUnique({ where: { id: parseInt(id) } }),
            prisma.role.findUnique({ where: { id: parseInt(roleId) } }),
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        }
        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        const updated = await prisma.users.update({
            where: { id: parseInt(id) },
            data: { roleId: parseInt(roleId) },
            select: {
                id: true,
                email: true,
                roleId: true,
                role: { select: { id: true, name_role: true } },
            },
        });

        return res.status(200).json({
            success: true,
            message: "Role assigned successfully",
            data: updated,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// get products by user id (supplier only)
const getUserProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const company = await prisma.companyProfiles.findUnique({
            where: { userId: parseInt(id) },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company profile not found for this user",
            });
        }

        const where = {
            supplierId: company.id,
            ...(status && { status }),
        };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: "desc" },
                include: {
                    category: { select: { id: true, name_categories: true } },
                    images: { select: { id: true, image_url: true } },
                },
            }),
            prisma.product.count({ where }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Products retrieved successfully",
            data: products,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    assignRole,
    getUserProducts,
};