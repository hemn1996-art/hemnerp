require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const adapter = new PrismaPg(pool, { pgbouncer: true });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("دەستپێکردنی گواستنەوەی کەرەستەکان...");

  const rawData = fs.readFileSync(path.join(__dirname, "..", "scratch", "products.json"), "utf8");
  const products = JSON.parse(rawData);

  let successCount = 0;

  for (const prod of products) {
    const isExpense = prod.category === "مەسروفات";
    try {
      await prisma.product.create({
        data: {
          code: prod.code,
          name: prod.name,
          category: prod.category === "مەسروفات" ? null : prod.category,
          isExpense: isExpense,
          isActive: prod.status === "active"
        }
      });
      console.log(`- داخڵکرا: ${prod.name}`);
      successCount++;
    } catch (err) {
      console.error(`❌ کێشە لە داخڵکردنی ${prod.name}: ${err.message}`);
    }
  }

  console.log(`\n✅ سەرکەوتوو بوو: ${successCount} کەرەستە داخڵ کران.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
