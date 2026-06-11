require('dotenv').config();
import { prisma } from "../lib/prisma";

async function main() {
  const accountTypes = await prisma.accountType.findMany();
  console.log("Account Types:");
  console.log(accountTypes);
}

main().catch(console.error).finally(() => prisma.$disconnect());
