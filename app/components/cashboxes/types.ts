export type CashboxType = "cash" | "bank";

export type CurrencyLike = {
  id: number;
  name: string;
  code: string;
  symbol: string;
  isActive?: boolean;
};

export type CashboxBalance = {
  currencyId: number;
  amount: number;
};

export type CashboxLike = {
  id: number;
  name: string;
  type?: CashboxType;
  balances: CashboxBalance[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CashboxForm = {
  name: string;
  type: CashboxType;
  isActive: boolean;
  balances: Record<number, string>;
};

export type MovementLike = {
  id?: number;
  receiptNo?: number;
  cashboxId?: number;
  fromCashboxId?: number;
  toCashboxId?: number;
  currencyId?: number;
  amount?: number;
  type?: string;
  note?: string;
  createdAt?: string;
  date?: string;
};
