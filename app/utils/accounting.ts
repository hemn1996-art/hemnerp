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