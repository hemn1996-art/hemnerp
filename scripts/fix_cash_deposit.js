const fs = require('fs');
const path = 'app/components/CashDepositPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetLine = '  const [accountSearch, setAccountSearch] = useState("");';
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
  phone?: string;
  city?: string;
  address?: string;
  balance?: number;
  isActive?: boolean;
  isShareholder?: boolean;
  shareholderBalance?: number;
  shareholderBalanceByCurrency?: Record<string, number>;
};

type CashboxLike = {
  id: number;
  name: string;
  balance?: number;
  balances?: { currencyId: number; amount: number }[];
  balanceByCurrency?: Record<string, number>;
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

type PrintOptions = {
  showReceiptInfo: boolean;
  showReceiptNumber: boolean;
  showReceiptDate: boolean;
  showCreatedTime: boolean;
  showCashbox: boolean;
  showShareholderInfo: boolean;
  showShareholderName: boolean;
  showShareholderPhone: boolean;
  showShareholderAddress: boolean;
  showEmployeeInfo: boolean;
};

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function CashDepositPage({ headerSelector, editId }: Props) {
  const accounts = (store.accounts || []) as AccountLike[];
  const cashboxes = (store.cashboxes || []) as CashboxLike[];

  const currentUser =
    ((store as any).currentUser ||
      (store as any).loggedInUser ||
      (store as any).user ||
      {}) as UserLike;

  const employeeNameFromLogin = currentUser.fullName || currentUser.name || "";
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
            if (voucher.accountId) {
              setAccountId(voucher.accountId);
              const acc = accounts.find((a) => a.id === voucher.accountId);
              if (acc) setAccountSearch(acc.name);
            }
            if (voucher.cashboxId) setCashboxId(voucher.cashboxId);
            
            if (voucher.amount) setAmount(String(voucher.amount));
            if (voucher.currencyId) setCurrencyId(voucher.currencyId);

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading edit voucher:", err));
    }
  }, [editId, accounts]);

`;

fs.writeFileSync(path, correctHeader + content.substring(targetIndex));
console.log("Fixed CashDepositPage.tsx");
