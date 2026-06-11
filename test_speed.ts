import { PrismaClient as NativeClient } from "@prisma/client";
import { prisma as AdapterClient } from "./lib/prisma";

async function run() {
  console.log("Starting speed test...");

  // 1. Test Native Prisma Client
  console.time("Native Client Initialization");
  const native = new NativeClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL
      }
    }
  } as any);
  await native.$connect();
  console.timeEnd("Native Client Initialization");

  console.time("Native Client Query");
  const res1 = await native.voucher.findMany({
    include: {
      account: true,
      lines: true,
      paidAmounts: true,
      expenses: true,
      ledgerEntries: true,
      versions: true,
    }
  });
  console.timeEnd("Native Client Query");
  console.log(`Native fetched ${res1.length} vouchers.`);

  // 2. Test Adapter Prisma Client
  console.time("Adapter Client Query");
  const res2 = await AdapterClient.voucher.findMany({
    include: {
      account: true,
      lines: true,
      paidAmounts: true,
      expenses: true,
      ledgerEntries: true,
      versions: true,
    }
  });
  console.timeEnd("Adapter Client Query");
  console.log(`Adapter fetched ${res2.length} vouchers.`);

  await native.$disconnect();
}

run().catch(console.error);
