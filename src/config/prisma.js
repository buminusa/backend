const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const { PrismaClient } = require("../generated/prisma");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const globalForPrisma = global;

function buildPoolConfig() {
  const url = new URL(process.env.DATABASE_URL);
  // mysql: or mariadb: protocol → use host/port
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // remove leading /
    acquireTimeout: 30000,
    idleTimeout: 60000,
    connectionLimit: 10,
    ssl: false,
  };
}

const createPrismaClient = () => {
  const adapter = new PrismaMariaDb(buildPoolConfig());
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
};

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;