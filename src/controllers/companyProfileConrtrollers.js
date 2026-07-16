const prisma = require("../config/prisma");

// get company profile menggunakan id user
const getCompanyProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const companyProfile = await prisma.companyProfiles.findUnique({
            where: {
                userId: parseInt(id)
            },
            select: {
                id: true,
                company_name: true,
                slug: true,
                npwp: true,
                address: true,
                province: true,
                country: true,
                phone: true,
                logo_url: true,
                business_description: true,
                verificationStatus: true,
                createdAt: true,
                updatedAt: true,

                user: {
                    select: {
                        id: true,
                        email: true,
                        role: {
                            select: {
                                id: true,
                                name_role: true
                            }
                        }
                    }
                },

                products: {
                    select: {
                        id: true,
                        nama: true,
                        slug: true,
                        status: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!companyProfile) {
            return res.status(404).json({
                success: false,
                message: "Company profile not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: companyProfile
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// get all company profiles (admin)
const getAllCompanyProfiles = async (req, res) => {
    try {

        const { page = 1, limit = 10, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = status ? { verificationStatus: status } : {};

        const [companies, total] = await Promise.all([
            prisma.companyProfiles.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    company_name: true,
                    slug: true,
                    province: true,
                    country: true,
                    phone: true,
                    logo_url: true,
                    verificationStatus: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                }
            }),
            prisma.companyProfiles.count({ where })
        ]);

        res.status(200).json({
            success: true,
            data: companies,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
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
}

// update company profile berdasarkan id user
const updateCompanyProfile = async (req, res) => {
    try {

        const { id } = req.params;
        const { company_name, address, province, country, phone, business_description } = req.body;

        const existing = await prisma.companyProfiles.findUnique({
            where: { userId: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Company profile not found"
            });
        }

        // regenerate slug kalau company_name berubah
        let slug = existing.slug;
        if (company_name && company_name !== existing.company_name) {
            const baseSlug = company_name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .trim()
                .replace(/\s+/g, "-");

            const slugTaken = await prisma.companyProfiles.findFirst({
                where: { slug: baseSlug, NOT: { id: existing.id } }
            });

            slug = slugTaken ? `${baseSlug}-${Date.now()}` : baseSlug;
        }

        const updated = await prisma.companyProfiles.update({
            where: { userId: parseInt(id) },
            data: {
                ...(company_name && { company_name, slug }),
                ...(address && { address }),
                ...(province && { province }),
                ...(country && { country }),
                ...(phone && { phone }),
                ...(business_description && { business_description })
            }
        });

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

// update logo berdasarkan id user
const updateLogo = async (req, res) => {
    try {

        const { id } = req.params;
        const logo = req.file?.path;

        if (!logo) {
            return res.status(400).json({
                success: false,
                message: "Logo file is required"
            });
        }

        const existing = await prisma.companyProfiles.findUnique({
            where: { userId: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Company profile not found"
            });
        }

        const updated = await prisma.companyProfiles.update({
            where: { userId: parseInt(id) },
            data: { logo_url: logo },
            select: { id: true, company_name: true, logo_url: true, updatedAt: true }
        });

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

// update verification status (admin only)
const updateVerificationStatus = async (req, res) => {
    try {

        const { id } = req.params;
        const { verificationStatus } = req.body;

        const allowedStatus = ["Pending", "Verified", "Rejected"];

        if (!verificationStatus || !allowedStatus.includes(verificationStatus)) {
            return res.status(400).json({
                success: false,
                message: `verificationStatus must be one of: ${allowedStatus.join(", ")}`
            });
        }

        const existing = await prisma.companyProfiles.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Company profile not found"
            });
        }

        const updated = await prisma.companyProfiles.update({
            where: { id: parseInt(id) },
            data: { verificationStatus },
            select: {
                id: true,
                company_name: true,
                verificationStatus: true,
                updatedAt: true
            }
        });

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = {
    getAllCompanyProfiles,
    getCompanyProfile,
    updateCompanyProfile,
    updateLogo,
    updateVerificationStatus
};