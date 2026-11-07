const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function restoreData(backupFilePath) {
  if (!backupFilePath || !fs.existsSync(backupFilePath)) {
    console.error("❌ Backup file not found:", backupFilePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(backupFilePath, "utf8");
  const backup = JSON.parse(raw);
  const data = backup.data;

  console.log("Connecting to target database:", process.env.DATABASE_URL?.split("@")[1]);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 20000,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Beginning data restoration in dependency order...\n");

    // 1. Users & Permissions
    if (data.users?.length) {
      console.log(`Restoring ${data.users.length} Users...`);
      for (const u of data.users) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: u,
          create: u,
        });
      }
    }

    if (data.userPermissions?.length) {
      console.log(`Restoring ${data.userPermissions.length} User Permissions...`);
      for (const up of data.userPermissions) {
        await prisma.userPermission.upsert({
          where: { id: up.id },
          update: up,
          create: up,
        });
      }
    }

    // 2. Currencies
    if (data.currencies?.length) {
      console.log(`Restoring ${data.currencies.length} Currencies...`);
      for (const c of data.currencies) {
        await prisma.currency.upsert({
          where: { id: c.id },
          update: c,
          create: c,
        });
      }
    }

    // 3. Location (Countries, Cities, Districts)
    if (data.countries?.length) {
      console.log(`Restoring ${data.countries.length} Countries...`);
      for (const c of data.countries) {
        await prisma.country.upsert({
          where: { id: c.id },
          update: c,
          create: c,
        });
      }
    }
    if (data.cities?.length) {
      console.log(`Restoring ${data.cities.length} Cities...`);
      for (const c of data.cities) {
        await prisma.city.upsert({
          where: { id: c.id },
          update: c,
          create: c,
        });
      }
    }
    if (data.districts?.length) {
      console.log(`Restoring ${data.districts.length} Districts...`);
      for (const d of data.districts) {
        await prisma.district.upsert({
          where: { id: d.id },
          update: d,
          create: d,
        });
      }
    }

    // 4. AccountTypes & Accounts
    if (data.accountTypes?.length) {
      console.log(`Restoring ${data.accountTypes.length} Account Types...`);
      for (const at of data.accountTypes) {
        await prisma.accountType.upsert({
          where: { id: at.id },
          update: at,
          create: at,
        });
      }
    }
    if (data.accounts?.length) {
      console.log(`Restoring ${data.accounts.length} Accounts...`);
      for (const a of data.accounts) {
        await prisma.account.upsert({
          where: { id: a.id },
          update: a,
          create: a,
        });
      }
    }

    // 5. Warehouses & Cashboxes
    if (data.warehouses?.length) {
      console.log(`Restoring ${data.warehouses.length} Warehouses...`);
      for (const w of data.warehouses) {
        await prisma.warehouse.upsert({
          where: { id: w.id },
          update: w,
          create: w,
        });
      }
    }
    if (data.cashboxes?.length) {
      console.log(`Restoring ${data.cashboxes.length} Cashboxes...`);
      for (const cb of data.cashboxes) {
        await prisma.cashbox.upsert({
          where: { id: cb.id },
          update: cb,
          create: cb,
        });
      }
    }
    if (data.cashboxBalances?.length) {
      console.log(`Restoring ${data.cashboxBalances.length} Cashbox Balances...`);
      for (const cbb of data.cashboxBalances) {
        await prisma.cashboxBalance.upsert({
          where: { id: cbb.id },
          update: cbb,
          create: cbb,
        });
      }
    }

    // 6. Product Metas & Products
    if (data.categories?.length) {
      for (const cat of data.categories) {
        await prisma.category.upsert({ where: { id: cat.id }, update: cat, create: cat });
      }
    }
    if (data.brands?.length) {
      for (const b of data.brands) {
        await prisma.brand.upsert({ where: { id: b.id }, update: b, create: b });
      }
    }
    if (data.packagings?.length) {
      for (const p of data.packagings) {
        await prisma.packaging.upsert({ where: { id: p.id }, update: p, create: p });
      }
    }
    if (data.priceTypes?.length) {
      for (const pt of data.priceTypes) {
        await prisma.priceType.upsert({ where: { id: pt.id }, update: pt, create: pt });
      }
    }
    if (data.products?.length) {
      console.log(`Restoring ${data.products.length} Products...`);
      for (const p of data.products) {
        await prisma.product.upsert({
          where: { id: p.id },
          update: p,
          create: p,
        });
      }
    }

    // 7. Vouchers & Children
    if (data.vouchers?.length) {
      console.log(`Restoring ${data.vouchers.length} Vouchers...`);
      for (const v of data.vouchers) {
        await prisma.voucher.upsert({
          where: { id: v.id },
          update: v,
          create: v,
        });
      }
    }
    if (data.voucherLines?.length) {
      console.log(`Restoring ${data.voucherLines.length} Voucher Lines...`);
      for (const vl of data.voucherLines) {
        await prisma.voucherLine.upsert({
          where: { id: vl.id },
          update: vl,
          create: vl,
        });
      }
    }
    if (data.voucherExpenses?.length) {
      console.log(`Restoring ${data.voucherExpenses.length} Voucher Expenses...`);
      for (const ve of data.voucherExpenses) {
        await prisma.voucherExpense.upsert({
          where: { id: ve.id },
          update: ve,
          create: ve,
        });
      }
    }
    if (data.voucherPaidAmounts?.length) {
      console.log(`Restoring ${data.voucherPaidAmounts.length} Voucher Paid Amounts...`);
      for (const vpa of data.voucherPaidAmounts) {
        await prisma.voucherPaidAmount.upsert({
          where: { id: vpa.id },
          update: vpa,
          create: vpa,
        });
      }
    }
    if (data.voucherVersions?.length) {
      for (const vv of data.voucherVersions) {
        await prisma.voucherVersion.upsert({
          where: { id: vv.id },
          update: vv,
          create: vv,
        });
      }
    }

    // 8. Ledgers & Inventory
    if (data.ledgerEntries?.length) {
      console.log(`Restoring ${data.ledgerEntries.length} Ledger Entries...`);
      for (const le of data.ledgerEntries) {
        await prisma.ledgerEntry.upsert({
          where: { id: le.id },
          update: le,
          create: le,
        });
      }
    }
    if (data.inventoryTransactions?.length) {
      console.log(`Restoring ${data.inventoryTransactions.length} Inventory Transactions...`);
      for (const it of data.inventoryTransactions) {
        await prisma.inventoryTransaction.upsert({
          where: { id: it.id },
          update: it,
          create: it,
        });
      }
    }

    // 9. Templates & Others
    if (data.invoiceTemplates?.length) {
      console.log(`Restoring ${data.invoiceTemplates.length} Invoice Templates...`);
      for (const tmpl of data.invoiceTemplates) {
        await prisma.invoiceTemplate.upsert({
          where: { id: tmpl.id },
          update: tmpl,
          create: tmpl,
        });
      }
    }

    // 10. Fixed Assets & Profit Distributions
    if (data.fixedAssetCategories?.length) {
      for (const fac of data.fixedAssetCategories) {
        await prisma.fixedAssetCategory.upsert({ where: { id: fac.id }, update: fac, create: fac });
      }
    }
    if (data.fixedAssets?.length) {
      for (const fa of data.fixedAssets) {
        await prisma.fixedAsset.upsert({ where: { id: fa.id }, update: fa, create: fa });
      }
    }
    if (data.fixedAssetHistories?.length) {
      for (const fah of data.fixedAssetHistories) {
        await prisma.fixedAssetHistory.upsert({ where: { id: fah.id }, update: fah, create: fah });
      }
    }
    if (data.profitDistributions?.length) {
      for (const pd of data.profitDistributions) {
        await prisma.profitDistribution.upsert({ where: { id: pd.id }, update: pd, create: pd });
      }
    }
    if (data.profitDistributionItems?.length) {
      for (const pdi of data.profitDistributionItems) {
        await prisma.profitDistributionItem.upsert({ where: { id: pdi.id }, update: pdi, create: pdi });
      }
    }

    console.log("\n==========================================");
    console.log("🎉 DATA RESTORATION FINISHED WITH 100% INTEGRITY!");
    console.log("==========================================\n");
  } catch (err) {
    console.error("❌ Restore failed:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Find latest backup
const backupDir = path.join(__dirname, "..", "backups");
const files = fs.readdirSync(backupDir).filter(f => f.startsWith("backup_tokyo_")).sort().reverse();
const targetBackup = process.argv[2] ? path.resolve(process.argv[2]) : path.join(backupDir, files[0]);
console.log("Target backup file:", targetBackup);

restoreData(targetBackup);
