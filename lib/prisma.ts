import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  pgPool: Pool;
};

const getPrismaClient = () => {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({
      // DIRECT_URL → session mode, پێویستە بۆ interactive transactions
      // max: 20 بەکاردەهێنین چونکە ئێستا بەکاردەهێنین Transaction Pooler (port 6543)
      connectionString: process.env.DATABASE_URL,
      max: 20,
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
