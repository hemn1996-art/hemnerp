import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const accounts = await p.account.findMany({
  where: { name: { contains: 'عومەر' } }
});
console.log('Accounts:', accounts);

const vouchers = await p.voucher.findMany({
  where: { accountId: { in: accounts.map(a => a.id) } },
  include: {
    ledgerEntries: true,
    paidAmounts: true,
  }
});
console.log('Vouchers:', JSON.stringify(vouchers, null, 2));

await p.$disconnect();
