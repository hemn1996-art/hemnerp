const fs = require('fs');
const path = 'app/components/ExpensePage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetLine = '  const [receiptNote, setReceiptNote] = useState("");';
const targetIndex = content.indexOf(targetLine);

if (targetIndex === -1) {
    console.error("Target line not found");
    process.exit(1);
}

const correctHeader = `"use client";
import DateInput from "./DateInput";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { store } from "../store/store";
import { saveInvoice } from "../utils/invoiceLogic";
import { currencies } from "../data/mockData";

type ToastType = "error" | "success" | "info";

type AccountLike = {
  id: number;
  name: string;
  accountTypeId?: number;
  phone?: string;
  city?: string;
  address?: string;
  balance?: number;
  balanceByCurrency?: Record<string, number>;
  creditLimitCurrencyId?: number;
  balanceCurrencyId?: number;
  isActive?: boolean;
};

type CashboxLike = {
  id: number;
  name: string;
  balance?: number;
  balances?: { currencyId: number; amount: number }[];
  balanceByCurrency?: Record<string, number>;
  isActive?: boolean;
};

type ProductLike = {
  id: number;
  name: string;
  code?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  costPrice?: number;
  salePrice?: number;
  stock?: number;
  isExpense?: boolean;
  isService?: boolean;
  isActive?: boolean;
};

type ExpenseRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  amount: string;
  currencyId: number;
  note: string;
};

type PaidAmounts = Record<string, string>;

type PrintOptions = {
  showReceiptInfo: boolean;
  showReceiptNumber: boolean;
  showReceiptDate: boolean;
  showCreatedTime: boolean;
  showCashbox: boolean;
  showAccountInfo: boolean;
  showAccountName: boolean;
  showAccountPhone: boolean;
  showAccountAddress: boolean;
  showExpenseRows: boolean;
};

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function ExpensePage({ headerSelector, editId }: Props) {
  const accounts = (store.accounts || []) as AccountLike[];
  const cashboxes = (store.cashboxes || []) as CashboxLike[];
  const products = (store.products || []) as ProductLike[];

  const defaultCurrency =
    currencies[0] ||
    ({ id: 1, name: "دۆلار", code: "USD", symbol: "$" } as any);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("error");

  const [receiptNumber, setReceiptNumber] = useState("");
  const [createdTime, setCreatedTime] = useState("");
  const [receiptDate, setReceiptDate] = useState("");

  useEffect(() => {
    if (!editId) {
      setReceiptNumber(Date.now().toString().slice(-6));
      setCreatedTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setReceiptDate(new Date().toISOString().slice(0, 10));
    }
  }, [editId]);

  useEffect(() => {
    if (editId) {
      fetch(\`/api/vouchers/\${editId}\`)
        .then((res) => res.json())
        .then((voucher) => {
          if (voucher) {
            setReceiptNumber(String(voucher.id));
            setReceiptDate(voucher.date.slice(0, 10));
            const d = new Date(voucher.date);
            setCreatedTime(
              d.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            );
            if (voucher.accountId) {
              setAccountId(voucher.accountId);
              const acc = accounts.find((a) => a.id === voucher.accountId);
              if (acc) setAccountSearch(acc.name);
            }
            if (voucher.cashboxId) setCashboxId(voucher.cashboxId);

            if (voucher.lines && Array.isArray(voucher.lines)) {
              const mappedRows = voucher.lines.map((line: any) => ({
                id: line.id,
                productId: line.productId,
                productName: line.product?.name || "نەناسراو",
                code: line.product?.code || "",
                amount: String(line.unitPrice),
                currencyId: line.currencyId || voucher.currencyId || 1,
                note: line.note || "",
              }));
              setRows(mappedRows);
            }

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            if (voucher.exchangeRate) {
              setExchangeRate(String(voucher.exchangeRate));
            }

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading edit voucher:", err));
    }
  }, [editId, accounts]);

  const [accountSearch, setAccountSearch] = useState("");
  const [accountId, setAccountId] = useState<number | undefined>();
  const [showAccountList, setShowAccountList] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  const [cashboxId, setCashboxId] = useState<number | undefined>(
    cashboxes[0]?.id
  );

  const [exchangeRate, setExchangeRate] = useState("1500");

  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [rows, setRows] = useState<ExpenseRow[]>([]);

`;

fs.writeFileSync(path, correctHeader + content.substring(targetIndex));
console.log("Fixed ExpensePage.tsx");
