const fs = require('fs');
const path = 'app/components/QuotationPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetLine = '  const [productSearch, setProductSearch] = useState("");';
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
type DiscountType = "amount" | "percent";

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

type UserLike = {
  id?: number;
  name?: string;
  fullName?: string;
  phone?: string;
  mobile?: string;
  mobileNumber?: string;
};

type QuotationRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  quantity: string;
  price: string;
  currencyId: number;
  discountValue: string;
  discountType: DiscountType;
  note: string;
};

type PrintOptions = {
  showReceiptInfo: boolean;
  showReceiptNumber: boolean;
  showReceiptDate: boolean;
  showCreatedTime: boolean;
  showQuotationNotice: boolean;
  showEmployeeInfo: boolean;
  showRows: boolean;
  showItemCode: boolean;
  showItemDiscount: boolean;
  showItemNote: boolean;
};

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function QuotationPage({ headerSelector, editId }: Props) {
  const products = (store.products || []) as ProductLike[];

  const currentUser =
    ((store as any).currentUser ||
      (store as any).loggedInUser ||
      (store as any).user ||
      {}) as UserLike;

  const employeeNameFromLogin =
    currentUser.fullName || currentUser.name || "";

  const employeePhoneFromLogin =
    currentUser.mobileNumber || currentUser.mobile || currentUser.phone || "";

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

            if (voucher.lines && Array.isArray(voucher.lines)) {
              const mappedRows = voucher.lines.map((line: any) => ({
                id: line.id,
                productId: line.productId,
                productName: line.product?.name || "نەناسراو",
                code: line.product?.code || "",
                quantity: String(line.qty / (line.packageQuantity || 1)),
                price: String(line.unitPrice),
                currencyId: line.currencyId || voucher.currencyId || 1,
                discountValue: String(line.discountAmount || ""),
                discountType: "amount",
                note: line.note || "",
              }));
              setRows(mappedRows);
            }

            if (voucher.invoiceDiscountValue) {
              setInvoiceDiscountValue(String(voucher.invoiceDiscountValue));
              if (voucher.invoiceDiscountType) {
                setInvoiceDiscountType(voucher.invoiceDiscountType);
              }
            }

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading edit voucher:", err));
    }
  }, [editId]);

`;

fs.writeFileSync(path, correctHeader + content.substring(targetIndex));
console.log("Fixed QuotationPage.tsx");
