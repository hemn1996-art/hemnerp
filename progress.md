## Checkpoint: Multi-Currency Profit Normalization & Invoice Row Fixed Cost Styling
- **Status**: Completed & Deployed to Live Production (**hemnerp.org**) (2026-09-01)
- **Key Enhancements**:
  1. **Multi-Currency Cost Normalization**: Fixed `isCostIQD` logic across `app/reports/invoices/page.tsx`, `lib/profitCalculator.ts`, and `app/api/reports/profit/route.ts` to detect IQD based on cost magnitude (> 500) rather than sale voucher transaction currency. Corrected profit calculations for IQD sales vouchers (e.g. Vouchers 200, 201, 202).
  2. **Product Details Drawer Cost Styling**: In `/invoices`, product cost inside the item detail drawer displays in vibrant purple (`#7c3aed`) with a fixed rate badge `جێگیر (135,000)` and tooltip when the product originated from fixed-rate dollar suppliers.
  3. **Product API Fixed Rate Propagation**: Enhanced `/api/products` to calculate moving average costs and propagate `exchangeRateType` and `customExchangeRate` from incoming vouchers.
  4. **Perpetual Moving Average Cost**: System uses strict perpetual moving average cost based on available on-hand stock whenever new inventory enters the warehouse.
  5. **Expense Item Strict Isolation**: Non-inventory expense products (`isExpense: true`) are strictly isolated to Expense Vouchers.

## Checkpoint: Fixed-Rate Supplier Profit & Weighted Average Cost Fix
- **Status**: Completed & Deployed to Live Production (**hemnerp.org**) (2026-09-01)
- **Root Cause & Resolution**:
  1. `app/api/vouchers/route.ts`: Added `exchangeRateType` & `customExchangeRate` to account selection, and selected `versions` so stock/inventory count vouchers pass their fixed rate data.
  2. `app/reports/invoices/page.tsx`: Fixed `productFixedRateMap` to read from version JSON snapshots, and `getItemCostUsdForVoucher` converts IQD cost at sale voucher daily exchange rate.
  3. `app/api/reports/stock/route.ts` & `app/api/reports/stock-snapshot/route.ts`: Non-multi-batch items use Weighted Average Cost (WAC) across incoming batches instead of overwriting with latest.
- **Visual**: Fixed-rate products appear in purple (#7c3aed) with tooltip in expanded voucher detail.
- **Schema Updated**: Rule #2, Rule #4 (WAC for non-multi-batch), Rule #7, Data Flow section #3.

## Checkpoint: Currency & Report Core Stabilization
- **Status**: Completed & Deployed to Production (hemnerp.org)
- **Verified Areas**:
  - Stock Report (`/reports/stock`) - Currency isolation, clean latest cost, instant quick search.
  - Stock Snapshot Report (`/reports/stock-snapshot`) - Currency isolation, clean latest cost.
  - Invoices Report (`/reports/invoices`) - Full text Kurdish/digit product search across lines, transactions, products, and version snapshots.
  - Invoice Page (`/invoices`) - Popup positioning (never obscures product name), native cost currency symbol display.
  - Database - Audited and reconciled 100% of inventory transactions and voucher lines.
  - Audit Script - Created `scripts/audit-currency-integrity.mjs`.
  - Profit Calculations - Standardized IQD purchase cost conversion to USD using sale voucher's exchange rate (`ڕەیتی کاتی فرۆشتنەکە`) across both `/api/reports/profit` and `/reports/invoices`. Exact IQD profit for IQD sales (net IQD - cost IQD) and synchronized USD totals box.

