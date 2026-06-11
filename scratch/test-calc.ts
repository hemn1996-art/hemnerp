import { calculateLedgerEntries } from '../app/utils/ledgerHelper';

const before = { "1": -8000 }; // Supplier has credit (negative balance) of $8000

const result = calculateLedgerEntries({
  type: "purchase",
  netAmount: 8000,
  currencyId: 1,
  exchangeRate: 1500,
  paidAmounts: [
    { currencyId: 1, amount: 2000, exchangeRate: 1 }
  ],
  extraPaymentHandling: null,
  balanceBeforeByCurrency: before
});

console.log("Result:", JSON.stringify(result, null, 2));
