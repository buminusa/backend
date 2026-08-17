require("dotenv").config();
const prisma = require("../src/config/prisma");

const roleSeeds = ["Super_Admin", "Admin", "Supplier", "Buyer"];

async function main() {
  for (const name of roleSeeds) {
    const existing = await prisma.role.findFirst({ where: { name_role: name } });
    if (existing) {
      console.log(`[SEED] Role ${name} exists`);
      continue;
    }
    await prisma.role.create({ data: { name_role: name } });
    console.log(`[SEED] Role ${name} created`);
  }

  console.log("[SEED] Selesai. Roles seeded.");
}

main()
  .catch((error) => {
    console.error("[SEED] Gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });