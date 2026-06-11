const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accountTypes = await prisma.accountType.findMany();
  console.log("Account Types:", accountTypes);
  
  const accounts = await prisma.account.findMany({ take: 5 });
  console.log("Accounts (sample):", accounts);

  // Check if there's any user table we missed
  const models = PrismaClient.name;
}

main().catch(console.error).finally(() => prisma.$disconnect());
