# Findings & Discovery Log

## Currency & Stock Architecture Discoveries

### 1. Root Cause of Dollar Items Showing as Dinar
- **Cause**: Frontend reports had legacy heuristics `Number(price || 0) > 1000 ? "دینار" : "$"` assuming any number > 1000 must be IQD. This broke all USD items priced over $1,000 (e.g. $1,295 Hitachi refrigerator).
- **Permanent Fix**: Removed all numeric heuristics. All UI components now strictly check `isIQD === true || currencyCode === "IQD"` provided authoritatively by backend APIs.

### 2. Root Cause of $150 Items Showing as $150.38
- **Cause 1**: In vendors with `exchangeRateType === 'FIXED'`, the backend was converting USD prices through `customExchangeRate / marketRate`, distorting USD values.
- **Cause 2**: Backend was blending initial inventory batches ($155) with new purchase batches ($150) using weighted average `(1*155 + 12*150)/13 = 150.3846`.
- **Permanent Fix**: Exempted USD items from fixed-rate conversion and set `cost` to the clean latest purchase unit price.

### 3. Root Cause of Details Popup Showing $22,500 for IQD Items
- **Cause**: In `InvoicePage.tsx`, the cost in the details popup was formatted with `getCurrencySymbol(row.currencyId)` (the invoice row's selling currency, which defaulted to USD), ignoring the product's actual purchase currency.
- **Permanent Fix**: Added `costCurrencyId` to `/api/products` and `InvoiceRow`, formatting cost with `getCurrencySymbol(row.costCurrencyId)`.

### 4. Details Popup Obscuring Product Name
- **Cause**: The popup position was anchored directly over the cell when opened.
- **Permanent Fix**: Positioned below the table row (`rect.bottom + 8`) with viewport flipping and highlighted the active row with a distinct blue focus ring.
