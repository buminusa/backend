const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");



// register for company
const registerCompany = async (req, res) => {
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
        let roleExisting = await prisma.role.findFirst({
            where: {
                name_role: "Supplier"
            }
        });

        if (!roleExisting) {
            roleExisting = await prisma.role.create({
                data: {
                    name_role: "Supplier"
                }
            });
        }

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


        return res.status(201).json({
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


// register for buyer
const registerBuyer = async (req, res) => {
    try {
        const { email, password, full_name, address, province, country, phone } = req.body;

        // field validation
        if (!email || !password || !full_name || !address || !province || !country || !phone) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the fields"
            })
        };

        // cek email sudah terdaftar atau belum
        const existingUser = await prisma.users.findUnique({
            where: {
                email: email
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }


        // ambil role buyer 
        let roleExisting = await prisma.role.findFirst({
            where: {
                name_role: "Buyer"
            }
        })

        if (!roleExisting) {
            roleExisting = await prisma.role.create({
                data: {
                    name_role: "Buyer"
                }
            });
        }

        // hash password 
        const hashedPassword = await bcrypt.hash(password, 10);

        // create user + buyer profile dalam satu transaksi
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.users.create({
                data: {
                    email: email,
                    password: hashedPassword,
                    roleId: roleExisting.id
                }
            });
            const buyerProfile = await tx.buyerProfiles.create({
                data: {
                    userId: user.id,
                    full_name: full_name,
                    address: address,
                    province: province,
                    country: country,
                    phone: phone
                }
            });
            return { user, buyerProfile };
        })

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                userId: result.user.id,
                email: result.user.email,
                buyerProfile: result.buyerProfile,
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

// login 
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // cek email
        const user = await prisma.users.findUnique({
            where: {
                email: email
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // cek password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // generate token
        const token = jwt.sign(
            { userId: user.id, email: user.email, roleId: user.roleId, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: token
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
    registerCompany,
    registerBuyer,
    login
}