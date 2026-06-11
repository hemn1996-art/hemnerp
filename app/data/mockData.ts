import { Account, AccountType, Cashbox, Currency, Product } from "../types";

export const currencies: Currency[] = [
  {
    id: 5,
    name: "دۆلار",
    code: "USD",
    symbol: "$",
    isActive: true,
  },
  {
    id: 6,
    name: "دینار",
    code: "IQD",
    symbol: "دینار",
    isActive: true,
  },
];

export const accountTypes: AccountType[] = [
  {
    id: 1,
    name: "کریار",
    isActive: true,
  },
  {
    id: 2,
    name: "دابینکەر",
    isActive: true,
  },
  {
    id: 3,
    name: "کۆمپانیای گواستنەوە",
    isActive: true,
  },
  {
    id: 4,
    name: "کۆمپانیای گومرک",
    isActive: true,
  },
];

export const accounts: Account[] = [
  {
    id: 1,
    name: "کاک ئەحمەد",
    accountTypeId: 1,
    phone: "07701234567",
    city: "سلێمانی",
    address: "سلێمانی - بازاڕ",
    notes: "کریاری ئاسایی",
    creditLimit: 5000,
    creditLimitCurrencyId: 5,
    debtAlertDays: 30,
    guarantorName: "کاک عومەر",
    balance: 1200,
    isActive: true,
  },
  {
    id: 2,
    name: "کاک کاروان",
    accountTypeId: 2,
    phone: "07707654321",
    city: "هەولێر",
    address: "هەولێر - شاری نوێ",
    notes: "دابینکەر",
    creditLimit: 10000000,
    creditLimitCurrencyId: 6,
    debtAlertDays: 45,
    guarantorName: "کاک ئارام",
    balance: -500,
    isActive: true,
  },
  {
    id: 3,
    name: "کۆمپانیای گواستنەوەی ستار",
    accountTypeId: 3,
    phone: "07709998877",
    city: "سلێمانی",
    address: "سلێمانی",
    notes: "بۆ خەرجی گواستنەوە",
    creditLimit: 0,
    creditLimitCurrencyId: 5,
    debtAlertDays: 0,
    guarantorName: "",
    balance: 0,
    isActive: true,
  },
  {
    id: 4,
    name: "کۆمپانیای گومرکی ئارام",
    accountTypeId: 4,
    phone: "07705554433",
    city: "بەغدا",
    address: "بەغدا",
    notes: "بۆ خەرجی گومرک",
    creditLimit: 0,
    creditLimitCurrencyId: 5,
    debtAlertDays: 0,
    guarantorName: "",
    balance: 0,
    isActive: true,
  },
  {
    id: 5,
    name: "کاک هێمن - خاوەن پشک",
    accountTypeId: 1,
    phone: "07701403038",
    city: "سلێمانی",
    address: "سلێمانی",
    notes: "خاوەن پشک بۆ تاقیکردنەوەی دانانی پارە و کشانەوەی پارە",
    creditLimit: 0,
    creditLimitCurrencyId: 5,
    debtAlertDays: 0,
    guarantorName: "",
    balance: 0,
    isShareholder: true,
    isActive: true,
  },
];

export const cashboxes: Cashbox[] = [
  {
    id: 1,
    name: "قاسەی دوکان",
    balances: [
      {
        currencyId: 5,
        amount: 400,
      },
      {
        currencyId: 6,
        amount: 1500000,
      },
    ],
    isActive: true,
  },
  {
    id: 2,
    name: "قاسەی دۆلار",
    balances: [
      {
        currencyId: 5,
        amount: 5000,
      },
    ],
    isActive: true,
  },
  {
    id: 3,
    name: "قاسەی دینار",
    balances: [
      {
        currencyId: 6,
        amount: 2500000,
      },
    ],
    isActive: true,
  },
];

export const products: Product[] = [
  {
    id: 1,
    name: "موبایل",
    code: "MB100",
    costPrice: 250,
    salePrice: 300,
    stock: 10,
    isActive: true,
  },
  {
    id: 2,
    name: "لابتۆپ",
    code: "LP200",
    costPrice: 700,
    salePrice: 850,
    stock: 5,
    isActive: true,
  },
  {
    id: 3,
    name: "خەرجی ئۆفیس",
    code: "EX100",
    costPrice: 0,
    salePrice: 0,
    stock: 0,
    isExpense: true,
    isActive: true,
  },
  {
    id: 4,
    name: "گواستنەوە",
    code: "SR100",
    costPrice: 0,
    salePrice: 0,
    stock: 0,
    isService: true,
    isActive: true,
  },
];