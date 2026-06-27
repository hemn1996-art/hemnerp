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
  console.log("دەستپێکردنی گواستنەوەی هەژمارەکان...");

  // Get AccountTypes
  const types = await prisma.accountType.findMany();
  const typeMap = {};
  for (const t of types) {
    typeMap[t.name] = t.id;
  }
  
  const customerTypeId = typeMap["کڕیار"];
  const supplierTypeId = typeMap["دابینکەر"];

  if (!customerTypeId || !supplierTypeId) {
    throw new Error("جۆری هەژمارەکان نەدۆزرانەوە (کڕیار/دابینکەر)");
  }

  const rawData = fs.readFileSync("C:\\Users\\ZETTA\\.gemini\\antigravity-ide\\brain\\4b28324f-151f-40c7-8566-1b846d29d724\\scratch\\accounts.json", "utf8");
  const accounts = JSON.parse(rawData);

  let successCount = 0;

  for (const acc of accounts) {
    let typeId = customerTypeId;
    
    if (acc.type === "کۆمپانیای گواستنەوە" || acc.type === "کارگەی صین" || acc.type === "دابینکەر") {
      typeId = supplierTypeId;
    }

    try {
      await prisma.account.create({
        data: {
          name: acc.name,
          phone: acc.phone || null,
          fullAddress: acc.address || null,
          accountTypeId: typeId,
          isActive: true
        }
      });
      console.log(`- داخڵکرا: ${acc.name}`);
      successCount++;
    } catch (err) {
      console.error(`❌ کێشە لە داخڵکردنی ${acc.name}: ${err.message}`);
    }
  }

  console.log(`\n✅ سەرکەوتوو بوو: ${successCount} هەژمار داخڵ کران.`);
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
