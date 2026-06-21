const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");



// register for company
const register = async (req, res) => {
    try {
        const { email, password, company_name, address, province, country, phone, business_description } = req.body;

        const npwp = req.files?.npwp?.[0]?.path;
        const logo = req.files?.logo?.[0]?.path;

        // field validation
        if (!email || !password || !company_name || !address || !province || !country || !phone || !business_description) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the fields"
            })
        };

        if (!npwp) {
            return res.status(400).json({
                success: false,
                message: "Please upload your NPWP file"
            })
        }

        // cek email sudah terdaftar atau belum
        const existingUser = await prisma.users.findUnique({
            where: {
                email: email
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "email Already exists"
            })
        };

        // ambil role supplier
        const roleExisting = await prisma.role.findFirst({
            where: {
                name_role: "Supplier"
            }
        });

        if (!roleExisting) {
            return res.status(400).json({
                success: false,
                message: "Role not found"
            })
        };

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // generate slug from company name
        const slug = company_name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");

        // cek slug sudah ada atau belum
        const existingSlug = await prisma.companyProfiles.findUnique({
            where: {
                slug: slug
            }
        });

        if (existingSlug) {
            return res.status(400).json({
                success: false,
                message: "Company name already exists"
            })
        }

        const finalSlug = await prisma.companyProfiles.findFirst({
            where: { slug }
        })
            ? `${slug}-${Date.now()}`
            : slug;

        // create user + company profile dalam satu transaksi
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.users.create({
                data: {
                    email: email,
                    password: hashedPassword,
                    roleId: roleExisting.id
                }
            });

            const companyProfile = await tx.companyProfiles.create({
                data: {
                    userId: user.id,
                    company_name: company_name,
                    slug: finalSlug,
                    npwp: npwp,
                    address: address,
                    province: province,
                    country: country,
                    phone: phone,
                    logo_url: logo,
                    business_description: business_description,
                }
            });

            return { user, companyProfile };
        });


        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                userId: result.user.id,
                email: result.user.email,
                companyProfile: result.companyProfile,
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = {
    register
}