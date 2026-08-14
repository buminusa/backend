const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateVerificationToken, generateResetToken, verifyToken } = require("../utils/tokenUtils");
const { queueVerificationEmail, queueResetPasswordEmail } = require("../utils/mailer");

// register for company
const registerCompany = async (req, res) => {
    try {
        const { email, password, company_name, address, province, country, phone, business_description } = req.body;
        const normalizedEmail = email?.toLowerCase().trim();

        // const npwp = req.files?.npwp?.[0]?.path;
        // const logo = req.files?.logo?.[0]?.path;

        // field validation
        if (!normalizedEmail || !password || !company_name || !address || !province || !country || !phone || !business_description) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the fields"
            })
        };

        // if (!npwp) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Please upload your NPWP file"
        //     })
        // }

        // cek email sudah terdaftar atau belum
        const existingUser = await prisma.users.findUnique({
            where: {
                email: normalizedEmail
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "email Already exists"
            })
        };

        // ambil role supplier
        const roleExisting = await prisma.$transaction(async (tx) => {
            let role = await tx.role.findFirst({ where: { name_role: "Supplier" } });
            if (!role) {
                try {
                    role = await tx.role.create({ data: { name_role: "Supplier" } });
                } catch (e) {
                    if (e.code === "P2002") {
                        role = await tx.role.findFirst({ where: { name_role: "Supplier" } });
                    } else {
                        throw e;
                    }
                }
            }
            return role;
        });

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // generate slug from company name
        const baseSlug = company_name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");

        // cek slug sudah ada atau belum, kalau ada tambahkan timestamp + random suffix biar tetap unik
        let finalSlug = baseSlug;
        let existingSlug = await prisma.companyProfiles.findFirst({ where: { slug: finalSlug } });
        while (existingSlug) {
            finalSlug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            existingSlug = await prisma.companyProfiles.findFirst({ where: { slug: finalSlug } });
        }

        // create user + company profile dalam satu transaksi
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.users.create({
                data: {
                    email: normalizedEmail,
                    password: hashedPassword,
                    roleId: roleExisting.id
                }
            });

            const companyProfile = await tx.companyProfiles.create({
                data: {
                    userId: user.id,
                    company_name: company_name,
                    slug: finalSlug,
                    // npwp: npwp,
                    address: address,
                    province: province,
                    country: country,
                    phone: phone,
                    // logo_url: logo,
                    business_description: business_description,
                }
            });

            return { user, companyProfile };
        });

        // kirim email verifikasi (via queue, tidak memblokir response)
        try {
            const verificationToken = generateVerificationToken(result.user.id);
            const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
            queueVerificationEmail(normalizedEmail, verifyUrl);
        } catch (error) {
            console.error("[AUTH] Gagal mengirim email verifikasi:", error.message || error);
        }

        return res.status(201).json({
            success: true,
            message: "User registered successfully. Silakan verifikasi email melalui link yang dikirim ke email Anda",
            data: {
                userId: result.user.id,
                email: result.user.email,
                verified: false,
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
        const normalizedEmail = email?.toLowerCase().trim();

        // field validation
        if (!normalizedEmail || !password || !full_name || !address || !province || !country || !phone) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the fields"
            })
        };

        // cek email sudah terdaftar atau belum
        const existingUser = await prisma.users.findUnique({
            where: {
                email: normalizedEmail
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }


        // ambil role buyer 
        const roleExisting = await prisma.$transaction(async (tx) => {
            let role = await tx.role.findFirst({ where: { name_role: "Buyer" } });
            if (!role) {
                try {
                    role = await tx.role.create({ data: { name_role: "Buyer" } });
                } catch (e) {
                    if (e.code === "P2002") {
                        role = await tx.role.findFirst({ where: { name_role: "Buyer" } });
                    } else {
                        throw e;
                    }
                }
            }
            return role;
        });

        // hash password 
        const hashedPassword = await bcrypt.hash(password, 10);

        // create user + buyer profile dalam satu transaksi
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.users.create({
                data: {
                    email: normalizedEmail,
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

        // kirim email verifikasi (via queue, tidak memblokir response)
        try {
            const verificationToken = generateVerificationToken(result.user.id);
            const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
            queueVerificationEmail(normalizedEmail, verifyUrl);
        } catch (error) {
            console.error("[AUTH] Gagal mengirim email verifikasi:", error.message || error);
        }

        return res.status(201).json({
            success: true,
            message: "User registered successfully. Silakan verifikasi email melalui link yang dikirim ke email Anda",
            data: {
                userId: result.user.id,
                email: result.user.email,
                verified: false,
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
        const normalizedEmail = email?.toLowerCase().trim();

        if (!normalizedEmail || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the fields"
            });
        }

        const user = await prisma.users.findUnique({
            where: {
                email: normalizedEmail
            },
            include: {
                buyerProfiles: true,
                companyProfiles: true,
                role: true
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!user.verified) {
            return res.status(403).json({
                success: false,
                message: "Email belum diverifikasi. Silakan verifikasi email Anda."
            });
        }

        const profileName = user.buyerProfiles?.full_name || user.companyProfiles?.company_name || user.email;

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                roleId: user.roleId,
                role: user.role.name_role,
                name: profileName
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: token,
            data: {
                verified: true
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

const logout = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}


const me = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                createdAt: true,
                role: {
                    select: {
                        id: true,
                        name_role: true
                    }
                },
                buyerProfiles: true,
                companyProfiles: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            data: user
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}


// verifikasi email via link (GET ?token=...)
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token verifikasi tidak ditemukan"
            });
        }

        let decoded;
        try {
            decoded = verifyToken(token, "verify_email");
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Token verifikasi tidak valid atau sudah kedaluwarsa"
            });
        }

        const user = await prisma.users.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan"
            });
        }

        if (user.verified) {
            return res.status(200).json({
                success: true,
                message: "Email sudah diverifikasi sebelumnya"
            });
        }

        await prisma.users.update({
            where: { id: user.id },
            data: { verified: true }
        });

        return res.status(200).json({
            success: true,
            message: "Email berhasil diverifikasi, akun Anda sudah aktif"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

// lupa password: kirim link reset ke email
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email?.toLowerCase().trim();

        if (!normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: "Email wajib diisi"
            });
        }

        const user = await prisma.users.findUnique({
            where: { email: normalizedEmail }
        });

        // anti user-enumeration: response tetap sama walau email tidak terdaftar
        if (user) {
            try {
                const resetToken = generateResetToken(user.id, user.email);
                const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
                queueResetPasswordEmail(user.email, resetUrl);
            } catch (error) {
                console.error("[AUTH] Gagal mengirim email reset password:", error.message || error);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Jika email terdaftar, link reset password akan dikirim ke email Anda"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

// reset password dengan token dari email
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Token dan password baru wajib diisi"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password minimal 6 karakter"
            });
        }

        let decoded;
        try {
            decoded = verifyToken(token, "reset_password");
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Token reset tidak valid atau sudah kedaluwarsa"
            });
        }

        const user = await prisma.users.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.users.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        return res.status(200).json({
            success: true,
            message: "Password berhasil direset, silakan login dengan password baru"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}


module.exports = {
    registerCompany,
    registerBuyer,
    login,
    logout,
    me,
    verifyEmail,
    forgotPassword,
    resetPassword
}