import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const voucher = await prisma.voucher.findUnique({
    where: { id: 51 }
  });
  console.log("Voucher 51:", voucher);
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
