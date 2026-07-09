const path = require("path");
const dotenv = require("dotenv");

const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const globalForPrisma = global;

const createPrismaClient = () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ["error"],
  });
};

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
