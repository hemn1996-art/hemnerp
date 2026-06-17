export interface AccountType {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  isActive?: boolean;
}

export interface Account {
  id: number;
  name: string;

  accountTypeId?: number;

  phone?: string;
  city?: string;
  address?: string;
  notes?: string;

  creditLimit?: number;
  creditLimitCurrencyId?: number;

  debtAlertDays?: number;
  guarantorName?: string;

  isActive?: boolean;
  isShareholder?: boolean;

  // لە بەشی هەژمار پیشان نادرێت، بۆ حیسابی ناوخۆیی/ڕاپۆرت دەمێنێت
  balance: number;
}

export interface CashboxBalance {
  currencyId: number;
  amount: number;
}

export interface Cashbox {
  id: number;
  name: string;
  balances: CashboxBalance[];
  isActive?: boolean;
}

export interface ProductPrice {
  currencyId: number;
  priceType: string;
  amount: number;
}

export interface ProductPackage {
  name: string;
  quantity: number;
}

export interface Product {
  id: number;
  name: string;
  code: string | null;

  // بۆ compatibility ـی کۆدەکانی ئێستا
  // کۆست لە بەشی کەرەستە داغڵ ناکرێت؛ لە پسوڵەی کڕین دیاری دەکرێت
  costPrice: number;
  salePrice: number;
  stock: number;

  category?: string;
  brand?: string;
  barcode?: string;
  packaging?: string;

  salePrices?: ProductPrice[];
  packages?: ProductPackage[];

  lowStockAlert?: number;
  hasExpiry?: boolean;
  expiryAlertDays?: number;

  // ئەم کەرەستە فرە وەجبەیە؟
  // ئەگەر true بێت، کۆگا و قازانج وەجبە وەجبە / FIFO حساب دەکرێت
  isMultiBatch?: boolean;

  isExpense?: boolean;
  isService?: boolean;
  isActive?: boolean;
  isDeletable?: boolean;
}

export type InvoiceType =
  | "فرۆشتن"
  | "کڕین"
  | "پارەی هاتوو"
  | "پارەی ڕۆشتوو"
  | "خەرجی"
  | "گەڕاندنەوەی فرۆش"
  | "گەڕاندنەوەی کڕین"
  | "قەرزی من"
  | "قەرزی خەڵک"
  | "داشکاندن لە قەرزی من"
  | "داشکاندن لە قەرزی خەڵک"
  | "دانانی پارە"
  | "کشانەوەی پارە"
  | "گواستنەوەی کەرەستە"
  | "سەرفی مواد"
  | "خەسارەی کۆگا"
  | "جەردی کۆگا";

export interface InvoiceItem {
  productId: number;

  // InvoicePage ـی ئێستا ئەمە بەکاردێنێت
  quantity: number;
  price: number;
  discount?: number;

  // ئەمانە بۆ کۆدەکانی داهاتوو / compatibility
  name?: string;
  qty?: number;
  total?: number;
}

export interface Invoice {
  id: number;
  type: InvoiceType;

  accountId?: number;
  cashboxId?: number;

  total: number;
  paid: number;
  remaining: number;

  items: InvoiceItem[];

  note?: string;
  printNote?: string;

  date?: string;
  createdAt?: string;
}