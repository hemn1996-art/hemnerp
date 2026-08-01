# Project Progress & Session Memory Log - HemnERP (Client 1: کۆگای دۆستان)

## Date: 2026-07-29

### Key Accomplishments Today:
1. **Unified Auto-Notes Format**:
   - Standardized `internalNote` and `printNote` formatting across all voucher types.
   - Dual currency representation and exchange rates formatted cleanly: `$ 2,400   1,981,000 دینار   ڕەیتی گۆڕینەوە 1,523.85   کۆی گشتی $ 3,700`.
   - Applied across both Client 1 (`hemnerp.org`) and Client 2 (`orientiraq.xyz`).

2. **Fixed Expense Page Edit Mode (`ExpensePage.tsx`)**:
   - Added missing `useEffect` fetch for `editId` to prevent perpetual loading spinner.
   - Mapped `voucher.lines` with fallback to `lineTotal` property so expense amounts and category names display accurately.

3. **Removed Cashbox Statement 10-Item Restriction**:
   - Updated `StatementModal.tsx` to display all cashbox movements instead of capping default date inputs to 10 records.
   - Restored full pagination (10, 20, 50, 100 rows per page) and date picker flexibility.

4. **Cashbox Balance Synchronization & Audit**:
   - Identified root cause of cashbox drift (credit sales vs paid amounts, missing `purchase_return` in `isIncoming` array).
   - Fixed `purchase_return` logic in POST, PUT, and DELETE voucher API endpoints.
   - Cleared test/movement vouchers and reset initial opening balances for all 4 cashboxes:
     - نووسینگەی بازار: 66,895,007.77 IQD | $ 162,736.621 USD
     - لای خۆم هێمن: 5,065 IQD | $ 3,336.2 USD
     - قاسەی دووکان: 707,780.55 IQD | $ 0 USD
     - حوالە صبن: 0 IQD | $ 0 USD

5. **Deployments**:
   - Both Client 1 (`hemnerp.org`) and Client 2 (`orientiraq.xyz`) successfully built and deployed to Vercel production.

### Next Steps / Current Checkpoint:
- System is in a 100% clean, verified, and production-ready state.
- Ready to resume on user's next request (`resume` or `continue`).
