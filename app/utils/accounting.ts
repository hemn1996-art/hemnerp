import { store } from "../store/store";
import { Cashbox, Account, Product } from "../types";

export function increaseCashbox(
  cashboxId: number,
  amount: number
) {
  const cashbox = store.cashboxes.find(
    (x: Cashbox) => x.id === cashboxId
  );

  if (!cashbox) return;

  cashbox.balance += amount;
}

export function decreaseCashbox(
  cashboxId: number,
  amount: number
) {
  const cashbox = store.cashboxes.find(
    (x: Cashbox) => x.id === cashboxId
  );

  if (!cashbox) return;

  cashbox.balance -= amount;
}

export function increaseAccountBalance(
  accountId: number,
  amount: number
) {
  const account = store.accounts.find(
    (x: Account) => x.id === accountId
  );

  if (!account) return;

  account.balance += amount;
}

export function decreaseAccountBalance(
  accountId: number,
  amount: number
) {
  const account = store.accounts.find(
    (x: Account) => x.id === accountId
  );

  if (!account) return;

  account.balance -= amount;
}

export function increaseStock(
  productId: number,
  qty: number
) {
  const product = store.products.find(
    (x: Product) => x.id === productId
  );

  if (!product) return;

  product.stock += qty;
}

export function decreaseStock(
  productId: number,
  qty: number
) {
  const product = store.products.find(
    (x: Product) => x.id === productId
  );

  if (!product) return;

  product.stock -= qty;
}

export function getDefaultCashbox(cashboxes: any[] | undefined | null): any | undefined {
  if (!Array.isArray(cashboxes) || cashboxes.length === 0) return undefined;
  
  // 1. First priority: exactly "دەغیلەی دوکان" (active)
  const exactActive = cashboxes.find(
    (c: any) => c && c.name && c.name.trim() === "دەغیلەی دوکان" && c.isActive !== false
  );
  if (exactActive) return exactActive;

  // 2. Second priority: contains "دەغیلەی دوکان" or "دەغیلە" (active)
  const containsActive = cashboxes.find(
    (c: any) => c && c.name && (c.name.includes("دەغیلەی دوکان") || c.name.includes("دەغیلە")) && c.isActive !== false
  );
  if (containsActive) return containsActive;

  // 3. Fallback: exact "دەغیلەی دوکان" even if isActive not explicitly set
  const exact = cashboxes.find((c: any) => c && c.name && c.name.trim() === "دەغیلەی دوکان");
  if (exact) return exact;

  // 4. Fallback: first active cashbox
  const firstActive = cashboxes.find((c: any) => c && c.isActive !== false);
  if (firstActive) return firstActive;

  // 5. Fallback: first cashbox in array
  return cashboxes[0];
}

export function getDefaultCashboxId(cashboxes: any[] | undefined | null): number | undefined {
  const box = getDefaultCashbox(cashboxes);
  return box ? box.id : undefined;
}