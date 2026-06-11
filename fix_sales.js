const fs = require('fs');
const path = 'app/components/SalesReturnPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetLine = '  const [showCustomerInfo, setShowCustomerInfo] = useState(false);';
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
type PaidAmounts = Record<number, string>;

type ProductLike = {
  id: number;
  name: string;
  code?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  stock?: number;
  costPrice?: number;
  costCurrencyId?: number;
  salePrice?: number;
  saleCurrencyId?: number;
  packages?: { name: string; quantity: number }[];
};

type AccountLike = {
  id: number;
  name: string;
  phone?: string;
  city?: string;
  address?: string;
  balance?: number;
  balanceByCurrency?: Record<string, number>;
  showInSales?: boolean;
};

type ReturnRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  qty: string;
  returnPrice: string;
  discount: string;
  note: string;
  packageName: string;
  packageQuantity: number;
  warehouseName: string;
  currencyId: number;
  availableStock: number;
  costPrice: number;
  costCurrencyId: number;
};

type TableColumns = {
  product: boolean;
  code: boolean;
  qty: boolean;
  returnPrice: boolean;
  discount: boolean;
  total: boolean;
  action: boolean;
};

type PrintOptions = {
  showInvoiceInfo: boolean;
  showInvoiceNumber: boolean;
  showInvoiceDate: boolean;
  showCreatedTime: boolean;
  showCashbox: boolean;
  showCustomerInfo: boolean;
  showCustomerName: boolean;
  showCustomerPhone: boolean;
  showCustomerAddress: boolean;
  showBalance: boolean;
};

const warehouses = [
  { id: 1, name: "کۆگای سەرەکی" },
  { id: 2, name: "کۆگای دووکان" },
];

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function SalesReturnPage({ headerSelector, editId }: Props) {
  const accounts = (store.accounts || []) as AccountLike[];
  const cashboxes = (store.cashboxes || []) as any[];
  const products = (store.products || []) as ProductLike[];

  const defaultCurrency =
    currencies[0] ||
    ({
      id: 1,
      name: "دۆلار",
      code: "USD",
      symbol: "$",
    } as any);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("error");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [createdTime, setCreatedTime] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  useEffect(() => {
    if (!editId) {
      setInvoiceNumber(Date.now().toString().slice(-6));
      setCreatedTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setInvoiceDate(new Date().toISOString().slice(0, 10));
    }
  }, [editId]);

  useEffect(() => {
    if (editId) {
      fetch(\`/api/vouchers/\${editId}\`)
        .then((res) => res.json())
        .then((voucher) => {
          if (voucher) {
            setInvoiceNumber(String(voucher.id));
            setInvoiceDate(voucher.date.slice(0, 10));
            const d = new Date(voucher.date);
            setCreatedTime(
              d.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            );
            if (voucher.accountId) {
              setCustomerId(voucher.accountId);
              const acc = accounts.find((a) => a.id === voucher.accountId);
              if (acc) setCustomerSearch(acc.name);
            }
            if (voucher.cashboxId) setCashboxId(voucher.cashboxId);

            if (voucher.lines && Array.isArray(voucher.lines)) {
              const mappedRows = voucher.lines.map((line: any) => ({
                id: line.id,
                productId: line.productId,
                productName: line.product?.name || "نەناسراو",
                code: line.product?.code || "",
                qty: String(line.qty / (line.packageQuantity || 1)),
                returnPrice: String(line.unitPrice),
                discount: String(line.discountAmount || ""),
                note: line.note || "",
                packageName: line.packageName || "دانە",
                packageQuantity: line.packageQuantity || 1,
                warehouseName: line.warehouseName || "کۆگای سەرەکی",
                currencyId: line.currencyId || voucher.currencyId || 1,
                availableStock: line.product?.stock || 0,
                costPrice: line.product?.costPrice || 0,
                costCurrencyId: line.product?.costCurrencyId || voucher.currencyId || 1,
              }));
              setRows(mappedRows);
            }

            const initialPaid: PaidAmounts = {};
            if (voucher.paidAmounts && Array.isArray(voucher.paidAmounts)) {
              voucher.paidAmounts.forEach((pa: any) => {
                initialPaid[pa.currencyId] = String(pa.amount);
              });
            }
            setPaidAmounts(initialPaid);

            setInternalNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowInvoiceNotes(true);

            if (voucher.exchangeRate) {
              setExchangeRate(String(voucher.exchangeRate));
            }

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading edit voucher:", err));
    }
  }, [editId, accounts]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [showCustomerList, setShowCustomerList] = useState(false);
`;

fs.writeFileSync(path, correctHeader + content.substring(targetIndex));
console.log("Fixed SalesReturnPage.tsx");
