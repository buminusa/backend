require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");

const PASSWORD = "12345678";

const ADMIN_ROLES = ["Super_Admin", "Admin"];
const roleSeeds = ["Super_Admin", "Admin", "Supplier", "Buyer"];

const userSeeds = [
    { email: "superadmin@gmail.com", role: "Super_Admin" },
    { email: "admin@gmail.com", role: "Admin" },
    { email: "supplier@gmail.com", role: "Supplier" },
    { email: "buyer@gmail.com", role: "Buyer" },
];

const supplierProfile = {
    company_name: "Bumi Nusa Supplier",
    slug: "bumi-nusa-supplier",
    npwp: "00.000.000.0-000.000",
    address: "Jl. Raya Industri No. 123",
    province: "DKI Jakarta",
    country: "Indonesia",
    phone: "081234567890",
    business_description: "Supplier bahan baku untuk kebutuhan industri Bumi Nusa.",
    verificationStatus: "Verified",
};

const buyerProfile = {
    full_name: "Buyer Bumi Nusa",
    address: "Jl. Melati No. 45",
    province: "Jawa Barat",
    country: "Indonesia",
    phone: "081298765432",
};

async function main() {
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    const roles = {};
    for (const name of roleSeeds) {
        roles[name] = await prisma.role.upsert({
            where: { id: -1 },
            update: {},
            create: { name_role: name },
        });
    }

    const rolesByEmail = {};
    const roleLookup = await prisma.role.findMany();
    for (const role of roleLookup) {
        if (roleSeeds.includes(role.name_role)) {
            rolesByEmail[role.name_role] = role;
        }
    }

    for (const seed of userSeeds) {
        const role = rolesByEmail[seed.role];
        if (!role) throw new Error(`Role ${seed.role} tidak ditemukan`);

        const existing = await prisma.users.findUnique({ where: { email: seed.email } });
        if (existing) {
            await prisma.users.update({
                where: { id: existing.id },
                data: {
                    roleId: role.id,
                    password: hashedPassword,
                    verified: ADMIN_ROLES.includes(seed.role) ? true : existing.verified,
                },
            });
            await prisma.$transaction(async (tx) => {
                if (seed.role === "Supplier") {
                    const profile = await tx.companyProfiles.findFirst({ where: { userId: existing.id } });
                    if (profile) {
                        await tx.companyProfiles.update({
                            where: { id: profile.id },
                            data: { verificationStatus: "Verified" },
                        });
                    } else {
                        await tx.companyProfiles.create({
                            data: { ...supplierProfile, userId: existing.id },
                        });
                    }
                }
                if (seed.role === "Buyer") {
                    const profile = await tx.buyerProfiles.findFirst({ where: { userId: existing.id } });
                    if (!profile) {
                        await tx.buyerProfiles.create({
                            data: { ...buyerProfile, userId: existing.id },
                        });
                    }
                }
            });
            console.log(`[SEED] User ${seed.email} diperbarui (role: ${seed.role})`);
            continue;
        }

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.users.create({
                data: {
                    email: seed.email,
                    password: hashedPassword,
                    roleId: role.id,
                    verified: ADMIN_ROLES.includes(seed.role),
                },
            });

            if (seed.role === "Supplier") {
                await tx.companyProfiles.create({
                    data: { ...supplierProfile, userId: user.id },
                });
            }

            if (seed.role === "Buyer") {
                await tx.buyerProfiles.create({
                    data: { ...buyerProfile, userId: user.id },
                });
            }

            return user;
        });

        console.log(`[SEED] User ${result.email} dibuat (role: ${seed.role})`);
    }

    console.log("[SEED] Selesai. Semua password: 12345678");
}

main()
    .catch((error) => {
        console.error("[SEED] Gagal:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
