const fs = require('fs');
const path = 'app/components/ProductTransferPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetLine = '  const [fromWarehouseId, setFromWarehouseId] = useState<number | undefined>(';
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

type ToastType = "error" | "success" | "info";

type WarehouseLike = {
  id: number;
  name: string;
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
  warehouseStocks?: {
    warehouseId: number;
    quantity: number;
    cost?: number;
  }[];
};

type TransferRow = {
  id: number;
  productId: number;
  productName: string;
  code: string;
  quantity: string;
  unitCost: number;
  note: string;
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
  showWarehouseInfo: boolean;
  showEmployeeInfo: boolean;
  showRows: boolean;
};

const fallbackWarehouses: WarehouseLike[] = [
  { id: 1, name: "کۆگای سەرەکی", isActive: true },
  { id: 2, name: "کۆگای دووەم", isActive: true },
];

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function ProductTransferPage({ headerSelector, editId }: Props) {
  const products = (store.products || []) as ProductLike[];

  const warehouses =
    (((store as any).warehouses || []) as WarehouseLike[]).length > 0
      ? (((store as any).warehouses || []) as WarehouseLike[])
      : fallbackWarehouses;

  const currentUser =
    ((store as any).currentUser ||
      (store as any).loggedInUser ||
      (store as any).user ||
      {}) as UserLike;

  const employeeNameFromLogin =
    currentUser.fullName || currentUser.name || "";

  const employeePhoneFromLogin =
    currentUser.mobileNumber || currentUser.mobile || currentUser.phone || "";

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
            if (voucher.fromWarehouseId) setFromWarehouseId(voucher.fromWarehouseId);
            if (voucher.toWarehouseId) setToWarehouseId(voucher.toWarehouseId);

            if (voucher.items && voucher.items.length > 0) {
              const mappedRows: TransferRow[] = voucher.items.map((i: any) => ({
                id: Math.random(),
                productId: i.productId,
                productName: i.name,
                code: i.code || "",
                quantity: String(i.quantity),
                unitCost: Number(i.unitCost || 0),
                note: i.note || "",
              }));
              setRows(mappedRows);
            }

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading edit voucher:", err));
    }
  }, [editId, warehouses]);

`;

fs.writeFileSync(path, correctHeader + content.substring(targetIndex));
console.log("Fixed ProductTransferPage.tsx");
