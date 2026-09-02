import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  pgPool: Pool;
  directPrisma?: PrismaClient;
  directPool?: Pool;
};

const getPrismaClient = () => {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({
      // DIRECT_URL → session mode, پێویستە بۆ interactive transactions
      // max: 5 بەکاردەهێنین تا سنووری ١٥ تێپەڕاندن نەبێت
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });
  }
  const adapter = new PrismaPg(globalForPrisma.pgPool);
  return new PrismaClient({ adapter });
};

// هەمیشە cache بکە — هەم development هەم production
export const prisma = globalForPrisma.prisma ?? getPrismaClient();
globalForPrisma.prisma = prisma;

const getDirectPrismaClient = () => {
  if (!globalForPrisma.directPool) {
    globalForPrisma.directPool = new Pool({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });
  }
  const adapter = new PrismaPg(globalForPrisma.directPool);
  return new PrismaClient({ adapter });
};

export const directPrisma = globalForPrisma.directPrisma ?? getDirectPrismaClient();
globalForPrisma.directPrisma = directPrisma;
