const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Starting Database Cleanup for Deleted Vouchers ===");
  
  const deletedVouchers = await prisma.voucher.findMany({
    where: { isDeleted: true },
    select: { id: true, type: true, referenceNo: true }
  });
  const deletedIds = deletedVouchers.map(v => v.id);
  console.log(`Found ${deletedIds.length} deleted vouchers:`, deletedIds);

  if (deletedIds.length > 0) {
    const deletedInvTxs = await prisma.inventoryTransaction.deleteMany({
      where: { voucherId: { in: deletedIds } }
    });
    console.log(`Deleted ${deletedInvTxs.count} orphaned inventoryTransaction rows.`);

    const deletedLedgers = await prisma.ledgerEntry.deleteMany({
      where: { voucherId: { in: deletedIds } }
    });
    console.log(`Deleted ${deletedLedgers.count} orphaned ledgerEntry rows.`);

    const deletedPaid = await prisma.voucherPaidAmount.deleteMany({
      where: { voucherId: { in: deletedIds } }
    });
    console.log(`Deleted ${deletedPaid.count} orphaned voucherPaidAmount rows.`);

    const deletedExp = await prisma.voucherExpense.deleteMany({
      where: { voucherId: { in: deletedIds } }
    });
    console.log(`Deleted ${deletedExp.count} orphaned voucherExpense rows.`);
  }

  console.log("=== Cleanup completed successfully ===");
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
