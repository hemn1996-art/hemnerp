# Project Schema & Currency Constitution

## 1. Core Principles & Currency Integrity Rules
1. **Never Guess Currency by Number Magnitude**:
   - Strictly forbidden: `if (price > 1000) isIQD = true` or similar heuristics.
   - Authoritative source of currency is ALWAYS `isIQD` boolean or `currencyCode === "IQD"` / `currencyId` from the database.
2. **Fixed Rate vs Daily Rate — Critical Distinction**:
   - Some supplier accounts (`Account.exchangeRateType === "FIXED"`) have a custom dollar rate (`Account.customExchangeRate`) that is LOWER than the daily market rate.
   - Products purchased from these suppliers are recorded in USD (e.g., `$115`) but their **real cost in IQD** = `unitCost$ × fixedRate` (e.g., `$115 × 1350 = 155,250 IQD`), NOT `unitCost$ × dailyRate`.
   - **NEVER compare fixed-rate USD cost directly with daily-rate USD selling price.** This produces wrong profit (e.g., `$5` instead of `~$19`).
   - The correct profit formula: `profitIQD = (salePrice$ × dailyRate) - (cost$ × fixedRate)`, then convert to display currency.
3. **Item Details & Cost Display**:
   - Product cost must always be rendered with its native cost currency (`costCurrencyId` / `costCurrencySymbol`).
   - Never format `product.costPrice` with the invoice row's selling currency symbol.
4. **Purchase Cost & Inventory Valuation (Perpetual Moving Average Cost / ئەڤەرێجی جوڵاو)**:
   - For regular (non-multi-batch, `isMultiBatch === false`) products: Stock reports (`/reports/stock` & `/reports/stock-snapshot`), invoice reports, and profit reports MUST use **Perpetual Moving Average Cost (ئەڤەرێجی جوڵاو)**. When new stock arrives, it is averaged with the **currently available on-hand quantity** at the previous average cost:
     $$\text{New Average Cost} = \frac{(Q_{\text{on\_hand}} \times C_{\text{current}}) + (Q_{\text{incoming}} \times C_{\text{incoming}})}{Q_{\text{on\_hand}} + Q_{\text{incoming}}}$$
   - When items are sold, they leave stock at the current moving average cost without altering the unit cost.
   - For multi-batch (`isMultiBatch === true`) products: Each batch retains its specific unit cost.
5. **Voucher Inventory Transactions**:
   - Every `InventoryTransaction` created or modified must receive `line.currencyId` explicitly from the voucher line.
6. **Centralized COGS & Profit Integrity**:
   - All profit and COGS calculations across backend APIs (`/api/reports/profit`) and frontend components (`/reports/invoices`) MUST use `lib/profitCalculator.ts`.
   - Never evaluate `unitCost` on a sale transaction directly as an un-normalized raw cost without resolving product purchase history or master catalog cost.
7. **Fixed-Rate Supplier Profit Calculation (MANDATORY)**:
   - Every cost/profit calculation MUST check `productFixedRateMap` (or `fixedCostIQDMap`).
   - For fixed-rate products, cost MUST be stored in IQD (`unitCost$ × fixedRate`), NOT in raw USD.
   - When computing COGS at sale time, convert IQD cost to USD at the **sale voucher's daily rate**: `costUSD = costIQD / saleRate`.
   - This applies to ALL three locations: `/reports/invoices` (frontend), `/api/reports/profit` (backend), and `lib/profitCalculator.ts`.
   - The reference implementation that was already correct is `/api/reports/material-movements/route.ts` (lines 228-239).
   - Visual indicator: fixed-rate products appear in **purple (#7c3aed)** in voucher detail views with tooltip showing the fixed rate.
8. **Expense Products Isolation (کەرەستەی خەرجی)**:
   - Products marked with `isExpense: true` are non-inventory expense items (e.g. electricity, rent, store expenses).
   - They MUST ONLY appear in Expense Vouchers (`/components/ExpensePage.tsx` or voucher type `expense`).
   - They MUST NEVER appear in Sales Invoices (`/invoices`), Purchases, Returns, Stock adjustments, or Warehouse stock reports (`/reports/stock`, `/reports/stock-snapshot`).

## 2. Main Models (Prisma)
- `Product`: Stores master item details, `salePrices`, `category`, `brand`, etc.
- `Voucher`: Headers for Sales, Purchases, Returns, Warehouses, Cashboxes.
- `VoucherLine`: Individual product rows with `unitPrice`, `discountAmount`, `currencyId`, `productId`.
- `InventoryTransaction`: Physical stock movements with `qtyChange`, `unitCost`, `currencyId`, `warehouseId`.
- `LedgerEntry`: Financial accounting debits/credits per account and currency.
- `CashboxBalance`: Cashbox balances per currency.
- `Account`: Customer/supplier with `exchangeRateType` ("DAILY_MARKET" | "FIXED") and `customExchangeRate`.

## 3. Fixed-Rate Data Flow (Architecture Reference)
```
Purchase from FIXED supplier ($115 at fixed 1,350):
  → InventoryTransaction: unitCost=115, currencyId=USD
  → Account: exchangeRateType="FIXED", customExchangeRate=135000
  → productFixedRateMap[productId] = 1350
  → fixedCostIQDMap[productId] = 115 × 1350 = 155,250 IQD

Sale at daily rate ($120, daily rate 1,541):
  → revenue = $120 × 1,541 = 184,920 IQD
  → costUSD_at_sale = fixedCostIQD / saleRate = 155,250 / 1,541 = $100.74
  → profitUSD = $120 - $100.74 = $19.26 ✅ (not $5 ❌)
```

