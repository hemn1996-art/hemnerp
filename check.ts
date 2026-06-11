import { prisma } from "./lib/prisma";

async function main() {
  const accounts = await prisma.account.findMany();
  console.log("Found accounts:", accounts.length);
  console.log(accounts.map(a => a.name));
  await prisma.$disconnect();
}

main().catch(console.error);
