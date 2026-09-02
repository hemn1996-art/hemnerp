"use client";
import { openPrintWindow } from "@/app/utils/printWindow";
import FormattedNumberInput from "./FormattedNumberInput";
import PrintHeader, { PrintWatermark } from "./PrintHeader";
import DateInput from "./DateInput";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useStore } from "../store/store";
import { getDefaultCashbox } from "../utils/accounting";
import { currencies as mockCurrencies } from "../data/mockData";

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
  const [isEditLoading, setIsEditLoading] = useState(!!editId);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAccounts = useStore((s: any) => s.fetchAccounts);
  const fetchCashboxes = useStore((s: any) => s.fetchCashboxes);

  useEffect(() => {
    fetchAccounts();
    fetchCashboxes();
  }, [fetchAccounts, fetchCashboxes]);

  useEffect(() => {
    setIsEditLoading(!!editId);
    if (editId) {
      setSavedSnapshot("");
    }
  }, [editId]);

  const accounts = useStore((s: any) => s.accounts || []) as AccountLike[];
  const cashboxes = useStore((s: any) => s.cashboxes || []) as CashboxLike[];
  const storeCurrencies = useStore((s: any) => s.currencies) || [];
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;
  const addVoucher = useStore((s: any) => s.addVoucher);
  const updateVoucher = useStore((s: any) => s.updateVoucher);

  const currentUser = useStore((s: any) => s.currentUser || {}) as UserLike;

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

  const [accountSearch, setAccountSearch] = useState("");
  const [accountId, setAccountId] = useState<number | undefined>();
  const [showAccountList, setShowAccountList] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  const [cashboxId, setCashboxId] = useState<number | undefined>(
    () => getDefaultCashbox(cashboxes)?.id
  );

  useEffect(() => {
    if (!editId && !cashboxId && cashboxes.length > 0) {
      const def = getDefaultCashbox(cashboxes);
      if (def?.id) setCashboxId(def.id);
    }
  }, [cashboxes, editId, cashboxId]);

  const [amount, setAmount] = useState("");
  const [currencyId, setCurrencyId] = useState<number>(defaultCurrency.id);
  const [exchangeRate, setExchangeRate] = useState<string>("154000");

  useEffect(() => {
    if (!editId && currencies && currencies.length > 0) {
      const iqd = currencies.find((c: any) => c.code === "IQD");
      if (iqd && iqd.rate) {
        setExchangeRate(String(iqd.rate * 100));
      }
    }
  }, [currencies, editId]);

  useEffect(() => {
    if (!editId) {
      setReceiptNumber("");
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
      fetch(`/api/vouchers/${editId}`)
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
              const acc = accounts.find((a: any) => a.id === voucher.accountId);
              if (acc) setAccountSearch(acc.name);
            }
            if (voucher.cashboxId) setCashboxId(voucher.cashboxId);

            const isIQDVoucher = voucher.paidAmounts && voucher.paidAmounts.length > 0 && (voucher.paidAmounts[0].currencyId === 2 || voucher.paidAmounts[0].currencyId === 12);
            if (isIQDVoucher) {
              setAmount(String(voucher.paidAmounts[0].amount));
              setCurrencyId(voucher.paidAmounts[0].currencyId);
            } else {
              const amt = voucher.totalAmount ?? voucher.amount;
              if (amt) setAmount(String(amt));
              if (voucher.currencyId) setCurrencyId(voucher.currencyId);
            }

            if (voucher.exchangeRate) {
              const rawEx = Number(voucher.exchangeRate);
              setExchangeRate(String(rawEx >= 1000 ? rawEx : rawEx * 100));
            }

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading voucher:", err))
        .finally(() => setIsEditLoading(false));
    }
  }, [editId, accounts]);

  const usdCurrencyId = currencies.find((c: any) => c.code === "USD")?.id || defaultCurrency.id || 1;
  const iqdCurrencyId = currencies.find((c: any) => c.code === "IQD")?.id || 2;
  const isIQD = currencyId === iqdCurrencyId || currencies.find((c: any) => c.id === currencyId)?.code === "IQD";

  const currentUsdEquivalent = useMemo(() => {
    const rawAmt = Number(amount) || 0;
    if (rawAmt <= 0) return 0;
    if (!isIQD) return rawAmt;
    const rate = (Number(exchangeRate) || 154000) / 100;
    return Number((rawAmt / rate).toFixed(2));
  }, [amount, isIQD, exchangeRate]);

  const [receiptNote, setReceiptNote] = useState("");
  const [printNote, setPrintNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showNewReceiptConfirm, setShowNewReceiptConfirm] = useState(false);

  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  const [lockedShareholderBalanceBefore, setLockedShareholderBalanceBefore] =
    useState<Record<string, number> | null>(null);

  const [lockedShareholderBalanceAfter, setLockedShareholderBalanceAfter] =
    useState<Record<string, number> | null>(null);

  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    showReceiptInfo: true,
    showReceiptNumber: true,
    showReceiptDate: true,
    showCreatedTime: true,
    showCashbox: true,
    showShareholderInfo: true,
    showShareholderName: true,
    showShareholderPhone: true,
    showShareholderAddress: true,
    showEmployeeInfo: false,
  });

  const selectedAccount = accounts.find((account: any) => account.id === accountId);
  const selectedCashbox = cashboxes.find((cashbox: any) => cashbox.id === cashboxId);

  const shareholderAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();

    const list = accounts.filter(
      (account: any) => account.isActive !== false && account.isShareholder === true
    );

    if (!q) return list;

    return list.filter((account: any) => {
      return (
        String(account.name || "").toLowerCase().includes(q) ||
        String(account.phone || "").toLowerCase().includes(q) ||
        String(account.city || "").toLowerCase().includes(q)
      );
    });
  }, [accounts, accountSearch]);

  function getShareholderBalanceByCurrency(account?: AccountLike) {
    const result: Record<string, number> = {};
    if (!account) return result;

    if (account.shareholderBalanceByCurrency) {
      for (const [currencyIdText, value] of Object.entries(
        account.shareholderBalanceByCurrency
      )) {
        const n = Number(value || 0);
        if (Math.abs(n) > 0.0001) {
          result[currencyIdText] = n;
        }
      }
    }

    if (
      Object.keys(result).length === 0 &&
      typeof account.shareholderBalance === "number"
    ) {
      result[String(usdCurrencyId)] = Number(
        account.shareholderBalance || 0
      );
    }

    return result;
  }

  function getShareholderBalanceAfter(baseMap: Record<string, number>) {
    const result: Record<string, number> = { ...baseMap };
    // باڵانسی پشک هەمیشە بە دۆلار زیاد دەبێت
    const usdKey = String(usdCurrencyId);
    result[usdKey] = Number(result[usdKey] || 0) + currentUsdEquivalent;
    return result;
  }

  const liveShareholderBalanceByCurrency =
    getShareholderBalanceByCurrency(selectedAccount);

  const liveShareholderBalanceAfterByCurrency =
    getShareholderBalanceAfter(liveShareholderBalanceByCurrency);

  const shareholderBalanceByCurrency =
    isLocked && lockedShareholderBalanceBefore
      ? lockedShareholderBalanceBefore
      : liveShareholderBalanceByCurrency;

  const shareholderBalanceAfterByCurrency =
    isLocked && lockedShareholderBalanceAfter
      ? lockedShareholderBalanceAfter
      : liveShareholderBalanceAfterByCurrency;

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      accountId,
      accountSearch,
      cashboxId,
      amount,
      currencyId,
      exchangeRate,
      receiptDate,
      createdTime,
      receiptNote,
      printNote,
      printOptions,
    });
  }, [
    accountId,
    accountSearch,
    cashboxId,
    amount,
    currencyId,
    exchangeRate,
    receiptDate,
    createdTime,
    receiptNote,
    printNote,
    printOptions,
  ]);

  useEffect(() => {
    if (editId && !isEditLoading && !savedSnapshot) {
      setSavedSnapshot(currentSnapshot);
    }
  }, [editId, isEditLoading, currentSnapshot, savedSnapshot]);

  const isSaved = savedSnapshot !== "" && savedSnapshot === currentSnapshot;
  useEffect(() => {
    const checkFn = () => {
      const unsaved = !isSaved && !isLocked && hasUnsavedData();
      return { unsaved, isEdit: !!editId };
    };
    checkFn.owner = 'CashDepositPage.tsx';
    (window as any).hasUnsavedChanges = checkFn;
    return () => {
      if ((window as any).hasUnsavedChanges && (window as any).hasUnsavedChanges.owner === 'CashDepositPage.tsx') {
        delete (window as any).hasUnsavedChanges;
      }
    };
  }, [isSaved, isLocked, editId, currentSnapshot]);

  function showToast(message: string, type: ToastType = "error") {
    setToastMessage(message);
    setToastType(type);

    window.setTimeout(() => {
      setToastMessage("");
    }, 3500);
  }

  function blockIfLocked() {
    if (isLocked) {
      showToast(
        "ئەم پسوڵەیە خەزن کراوە و ئیتر ناتوانرێت گۆڕانکاری لەسەر بکرێت."
      );
      return true;
    }

    return false;
  }

  function toNumber(value: string | number | undefined) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function getCurrencySymbol(id?: number) {
    return currencies.find((currency: any) => currency.id === id)?.symbol || "$";
  }

  function getCurrencyCode(id?: number) {
    return currencies.find((currency: any) => currency.id === id)?.code || "";
  }

  function formatCurrencyAmount(value: number, id: number) {
    const code = getCurrencyCode(id);
    const symbol = getCurrencySymbol(id);
    const absVal = Math.abs(Number(value || 0));
    if (code === "IQD") {
      return `${absVal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} دینار`;
    }
    return `${symbol} ${absVal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  function formatCurrencyAmountJSX(value: number, currencyIdVal: number, isNegativeParam?: boolean) {
    const code = getCurrencyCode(currencyIdVal);
    const symbol = getCurrencySymbol(currencyIdVal);
    const isIQDVal = code === "IQD";
    const absVal = Math.abs(Number(value || 0));
    const isNegative = isNegativeParam !== undefined ? isNegativeParam : Number(value || 0) < -0.001;
    const formatted = absVal.toLocaleString("en-US", {
      minimumFractionDigits: isIQDVal ? 0 : 2,
      maximumFractionDigits: isIQDVal ? 0 : 2,
    });

    const parts = formatted.split('.');
    const whole = parts[0];
    const decimal = parts[1];
    const displaySymbol = isIQDVal ? "دینار" : symbol;

    return (
      <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "baseline", gap: 3 }} dir="ltr">
        {isNegative && <span>-</span>}
        <span style={{ fontSize: "0.85em", opacity: 0.85, fontWeight: 700 }}>{displaySymbol}</span>
        <span>
          <span>{whole}</span>
          {decimal && decimal !== "0" && decimal !== "00" && <span style={{ fontSize: "0.8em", opacity: 0.85 }}>.{decimal}</span>}
        </span>
      </span>
    );
  }

  function formatCurrencyMap(map: Record<string, number>) {
    const active = Object.entries(map).filter(([, val]) => Math.abs(Number(val || 0)) > 0.0001);
    if (active.length === 0) {
      return formatCurrencyAmountJSX(0, usdCurrencyId);
    }
    return (
      <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
        {active.map(([currencyIdText, val], idx) => (
          <span key={currencyIdText} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {idx > 0 && <span style={{ color: "#6b7280" }}> ، </span>}
            {formatCurrencyAmountJSX(val, Number(currencyIdText))}
          </span>
        ))}
      </span>
    );
  }

  function formatDate(dateText: string) {
    if (!dateText) return "-";
    const [year, month, day] = dateText.split("-");
    return `${day}/${month}/${year}`;
  }

  function validateBeforeSave() {
    if (!accountId) {
      showToast("تکایە هەژماری خاوەن پشک هەڵبژێرە.");
      return false;
    }

    if (!selectedAccount?.isShareholder) {
      showToast("ئەم هەژمارە خاوەن پشک نییە.");
      return false;
    }

    if (!cashboxId) {
      showToast("تکایە قاسە هەڵبژێرە.");
      return false;
    }

    if (toNumber(amount) <= 0) {
      showToast("تکایە بڕی پارە داغڵ بکە.");
      return false;
    }

    return true;
  }

  function applyCashboxIncrease() {
    const cashbox = cashboxes.find((item: any) => item.id === cashboxId);
    if (!cashbox) return;

    const depositAmount = toNumber(amount);

    if (!cashbox.balances) cashbox.balances = [];

    const foundBalance = cashbox.balances.find(
      (item: any) => item.currencyId === currencyId
    );

    if (foundBalance) {
      foundBalance.amount = Number(foundBalance.amount || 0) + depositAmount;
    } else {
      cashbox.balances.push({
        currencyId,
        amount: depositAmount,
      });
    }

    if (!cashbox.balanceByCurrency) cashbox.balanceByCurrency = {};

    cashbox.balanceByCurrency[String(currencyId)] =
      Number(cashbox.balanceByCurrency[String(currencyId)] || 0) +
      depositAmount;

    if (typeof cashbox.balance === "number") {
      cashbox.balance = Number(cashbox.balance || 0) + depositAmount;
    }
  }

  function applyShareholderBalanceIncrease() {
    const account = accounts.find((item: any) => item.id === accountId);
    if (!account) return;

    const depositAmount = currentUsdEquivalent;
    const usdKey = String(usdCurrencyId);

    if (!account.shareholderBalanceByCurrency) {
      account.shareholderBalanceByCurrency = {};
    }

    account.shareholderBalanceByCurrency[usdKey] =
      Number(account.shareholderBalanceByCurrency[usdKey] || 0) +
      depositAmount;

    if (typeof account.shareholderBalance === "number") {
      account.shareholderBalance =
        Number(account.shareholderBalance || 0) + depositAmount;
    } else {
      account.shareholderBalance = depositAmount;
    }
  }

  function resetReceipt() {
    setReceiptNumber("");

    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    setReceiptDate(new Date().toISOString().slice(0, 10));

    setAccountId(undefined);
    setAccountSearch("");
    setShowAccountList(false);
    setShowAccountInfo(false);

    setCashboxId(getDefaultCashbox(cashboxes)?.id);
    setAmount("");
    setCurrencyId(defaultCurrency.id);

    setReceiptNote("");
    setPrintNote("");
    setShowNotes(false);

    setSavedSnapshot("");
    setIsLocked(false);
    setLockedShareholderBalanceBefore(null);
    setLockedShareholderBalanceAfter(null);
  }

  function hasUnsavedData() {
    return (
      accountId !== undefined ||
      accountSearch.trim() !== "" ||
      amount.trim() !== "" ||
      receiptNote.trim() !== "" ||
      printNote.trim() !== ""
    );
  }

  function handleNewReceipt() {
    if (hasUnsavedData() && !isSaved && !isLocked) {
      setShowNewReceiptConfirm(true);
      return;
    }

    resetReceipt();
  }

  function handleSave() {
    if (isLocked) {
      showToast("ئەم پسوڵەیە پێشتر خەزن کراوە.");
      return;
    }

    if (!validateBeforeSave()) return;

    const shareholderBalanceBeforeAtSave =
      getShareholderBalanceByCurrency(selectedAccount);

    const shareholderBalanceAfterAtSave =
      getShareholderBalanceAfter(shareholderBalanceBeforeAtSave);

    const combineDateAndTime = (dateStr: string, timeStr: string) => {
      try {
        if (!dateStr) return new Date().toISOString();
        let cleanTime = (timeStr || "").trim();
        const ampmMatch = cleanTime.match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)$/i);
        if (ampmMatch) {
          let hours = parseInt(ampmMatch[1], 10);
          const minutes = ampmMatch[2];
          const ampm = ampmMatch[3].toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
          cleanTime = `${String(hours).padStart(2, "0")}:${minutes}`;
        }
        const hhmmMatch = cleanTime.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])/);
        if (hhmmMatch) {
          const hours = hhmmMatch[1].padStart(2, "0");
          const minutes = hhmmMatch[2];
          const d = new Date(`${dateStr}T${hours}:${minutes}:00`);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
        const fallback = new Date(`${dateStr} ${cleanTime}`);
        if (!isNaN(fallback.getTime())) return fallback.toISOString();
        const fallbackDate = new Date(dateStr);
        if (!isNaN(fallbackDate.getTime())) return fallbackDate.toISOString();
      } catch (e) {
        console.error("Error combining date and time:", e);
      }
      return new Date().toISOString();
    };

    const rateVal = (toNumber(exchangeRate) / 100) || 1540;
    const autoNote = isIQD
      ? `(${toNumber(amount).toLocaleString('en-US')} دینار بە ڕەیتی 100 دۆلاری ${toNumber(exchangeRate).toLocaleString('en-US')} دیناری)`
      : "";
    const finalPrintNote = autoNote ? (printNote ? `${autoNote}\n${printNote}` : autoNote) : printNote;

    const payload = {
      type: "shareholder_deposit",
      referenceNo: receiptNumber,
      date: combineDateAndTime(receiptDate, createdTime),
      accountId: accountId ? Number(accountId) : null,
      cashboxId: cashboxId ? Number(cashboxId) : null,
      currencyId: usdCurrencyId, // هەمیشە بە دۆلار بۆ باڵانسی خاوەن پشک
      exchangeRate: rateVal,
      totalAmount: currentUsdEquivalent,
      netAmount: 0,
      internalNote: receiptNote,
      printNote: finalPrintNote,
      paidAmounts: [
        {
          currencyId: Number(currencyId),
          amount: toNumber(amount),
          exchangeRate: rateVal
        }
      ],
      employeeName: employeeNameFromLogin,
    };

    setIsSaving(true);
    const effectiveEditId = editId || (typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('editId') || new URLSearchParams(window.location.search).get('edit')) : null);
    const isEditMode = Boolean(effectiveEditId && !isNaN(Number(effectiveEditId)) && Number(effectiveEditId) > 0);
    const savePromise = isEditMode
      ? updateVoucher(Number(effectiveEditId), payload)
      : addVoucher(payload);

    savePromise
      .then((res: any) => {
        if (res) {
          if (!editId) {
            applyCashboxIncrease();
            applyShareholderBalanceIncrease();
            setLockedShareholderBalanceBefore(shareholderBalanceBeforeAtSave);
            setLockedShareholderBalanceAfter(shareholderBalanceAfterAtSave);
            setIsLocked(true);
          }
          setSavedSnapshot(currentSnapshot);
          showToast(
            editId
              ? "پسوڵەکە بە سەرکەوتوویی نوێکرایەوە ✅"
              : "پسوڵەی دانانی پارە خەزن کرا ✅",
            "success"
          );
        } else {
          showToast("تکایە دووبارە هەوڵ بدەرەوە ❌");
        }
      })
      .catch((err: any) => {
        console.error("Save error:", err);
        showToast("پەیوەندی لەکارکەوت، تکایە دووبارە هەوڵ بدەرەوە ❌");
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  function handlePrint() {
    if (!editId && !isLocked && !isSaved) {
      showToast("پێش پرێنتکردن دەبێت پسوڵەکە خەزن بکەیت.");
      return;
    }

    openPrintWindow("cash-deposit-print-area");
  }

  function togglePrintOption(key: keyof PrintOptions) {
    setPrintOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const lockedFieldStyle: CSSProperties = isLocked
    ? { background: "#f3f4f6", cursor: "not-allowed" }
    : {};

  return (
    <div style={page}>
      {isEditLoading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(255,255,255,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          backdropFilter: "blur(2px)",
        }}>
          <div style={{ fontSize: 16, fontWeight: "bold", color: "#1e3a8a" }}>
            لە بارکردندایە...
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          style={{
            ...toast,
            background:
              toastType === "success"
                ? "#16a34a"
                : toastType === "info"
                ? "#2563eb"
                : "#dc2626",
          }}
        >
          {toastMessage}
        </div>
      )}

      <div style={topBar}>
        <div style={topBarActions}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              ...saveBtn,
              opacity: isSaving ? 0.7 : 1,
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            {isSaving ? "خەزن دەکرێت..." : editId ? "نوێکردنەوە" : "خەزنکردن"}
          </button>

          <button type="button" onClick={handlePrint} style={printBtn}>
            پرێنت
          </button>

          <button
            type="button"
            onClick={handleNewReceipt}
            style={newReceiptBtn}
          >
            پسوڵەی نوێ
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            style={settingsBtn}
          >
            ڕێکخستن
          </button>
        </div>

        <div>{headerSelector}</div>
      </div>

      <div style={workspaceGrid}>
        <aside style={rightSidebar}>
          <div style={accountSearchBox}>
            <Field label="گەڕان بەدوای خاوەن پشک">
              <input
                type="text"
                value={accountSearch}
                disabled={isLocked}
                placeholder="ناو ، ژمارە مۆبایل ، شار بنووسە..."
                onChange={(event) => {
                  if (blockIfLocked()) return;
                  setAccountSearch(event.target.value);
                  setShowAccountList(true);
                }}
                onFocus={() => {
                  if (isLocked) return;
                  setShowAccountList(true);
                }}
                style={{ ...input, ...lockedFieldStyle }}
              />
            </Field>

            {showAccountList && !isLocked && shareholderAccounts.length > 0 && (
              <div style={accountDropdown}>
                {shareholderAccounts.map((account: any) => (
                  <button
                    type="button"
                    key={account.id}
                    style={dropdownItem}
                    onMouseDown={() => {
                      setAccountId(account.id);
                      setAccountSearch(account.name);
                      setShowAccountList(false);
                      setShowAccountInfo(false);
                    }}
                  >
                    <strong>{account.name}</strong>
                    <span style={smallMuted}>
                      {account.phone || "-"} / {account.city || "-"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedAccount && (
            <button
              type="button"
              style={noteToggleBtn}
              onClick={() => setShowAccountInfo((prev) => !prev)}
            >
              {showAccountInfo
                ? "▲ شاردنەوەی زانیاری خاوەن پشک"
                : "▼ زانیاری خاوەن پشک"}
            </button>
          )}

          {selectedAccount && showAccountInfo && (
            <div style={accountCard}>
              <InfoRow label="ژمارە">{selectedAccount.phone || "-"}</InfoRow>
              <InfoRow label="شار">{selectedAccount.city || "-"}</InfoRow>
              <InfoRow label="ناونیشان">
                {selectedAccount.address || "-"}
              </InfoRow>

              <InfoRow label="باڵانسی پشک">
                {formatCurrencyMap(shareholderBalanceByCurrency)}
              </InfoRow>

              <InfoRow label="دوای دانان">
                {formatCurrencyMap(shareholderBalanceAfterByCurrency)}
              </InfoRow>
            </div>
          )}

          <div style={totalsCard}>
            <div style={totalGridSingle}>
              <StatBox
                title="پارەی دانراو"
                value={
                  toNumber(amount) > 0
                    ? formatCurrencyAmount(toNumber(amount), currencyId)
                    : "0"
                }
                color="#16a34a"
              />
            </div>

            {isIQD && toNumber(amount) > 0 && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, textAlign: "center" }}>
                <span style={{ fontSize: 13, fontWeight: "bold", color: "#166534" }}>
                  بڕی دۆلاری هاوتا: ${currentUsdEquivalent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <Field label="قاسە">
              <select
                value={cashboxId || ""}
                disabled={isLocked}
                onChange={(event) => {
                  if (blockIfLocked()) return;
                  setCashboxId(Number(event.target.value));
                }}
                style={{ ...input, ...lockedFieldStyle }}
              >
                {cashboxes
                  .filter((cashbox: any) => cashbox.isActive !== false)
                  .map((cashbox: any) => (
                    <option key={cashbox.id} value={cashbox.id}>
                      {cashbox.name}
                    </option>
                  ))}
              </select>
            </Field>

            <div style={twoCol}>
              <Field label="بڕی پارە">
                <FormattedNumberInput
                  value={amount}
                  disabled={isLocked}
                  onChange={(val) => {
                    if (blockIfLocked()) return;
                    setAmount(val);
                  }}
                  placeholder="0"
                  style={{ ...input, ...lockedFieldStyle }}
                />
              </Field>

              <Field label="دراو">
                <select
                  value={currencyId}
                  disabled={isLocked}
                  onChange={(event) => {
                    if (blockIfLocked()) return;
                    setCurrencyId(Number(event.target.value));
                  }}
                  style={{ ...input, ...lockedFieldStyle, minWidth: "130px" }}
                >
                  {currencies.map((currency: any) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {isIQD && (
              <Field label="ڕەیتی ١٠٠ دۆلار (بۆ گۆڕین بۆ باڵانسی دۆلار)">
                <FormattedNumberInput
                  value={exchangeRate}
                  disabled={isLocked}
                  onChange={(val) => {
                    if (blockIfLocked()) return;
                    setExchangeRate(val);
                  }}
                  placeholder="154,000"
                  style={{ ...input, ...lockedFieldStyle, borderColor: "#3b82f6" }}
                />
              </Field>
            )}

            <Field label="بەروار">
              <DateInput
                value={receiptDate}
                disabled={isLocked}
                onChange={(val) => {
                  if (blockIfLocked()) return;
                  setReceiptDate(val);
                }}
                style={{ ...input, ...lockedFieldStyle }}
              />
            </Field>

            <div style={noteToggleBox}>
              <button
                type="button"
                disabled={isLocked}
                style={{
                  ...noteToggleBtn,
                  opacity: isLocked ? 0.55 : 1,
                  cursor: isLocked ? "not-allowed" : "pointer",
                }}
                onClick={() => {
                  if (blockIfLocked()) return;
                  setShowNotes((prev) => !prev);
                }}
              >
                {showNotes ? "▲ شاردنەوەی تێبینی" : "▼ زیادکردنی تێبینی"}
              </button>

              {showNotes && (
                <div style={notesInsidePayment}>
                  <Field label="تێبینی ناوخۆیی">
                    <textarea
                      value={receiptNote}
                      disabled={isLocked}
                      onChange={(event) => {
                        if (blockIfLocked()) return;
                        setReceiptNote(event.target.value);
                      }}
                      rows={2}
                      placeholder="تێبینی ناوخۆیی بنووسە..."
                      style={{ ...textarea, ...lockedFieldStyle }}
                    />
                  </Field>

                  <Field label="تێبینی سەر پسوڵە">
                    <textarea
                      value={printNote}
                      disabled={isLocked}
                      onChange={(event) => {
                        if (blockIfLocked()) return;
                        setPrintNote(event.target.value);
                      }}
                      rows={2}
                      placeholder={isIQD ? `خۆکارانە دەنوسرێت: (${toNumber(amount).toLocaleString('en-US')} دینار بە ڕەیتی 100 دۆلاری ${toNumber(exchangeRate).toLocaleString('en-US')} دیناری)` : "تێبینی سەر پسوڵە بنووسە..."}
                      style={{ ...textarea, ...lockedFieldStyle }}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main style={mainContent}>
          <div style={emptyMainCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#1e3a8a" }}>
                پسوڵەی دانانی پارە (Deposit)
              </div>
              <button
                type="button"
                onClick={handlePrint}
                style={viewBtn}
              >
                پێشبینینی پرێنت
              </button>
            </div>

            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div style={{ background: "white", padding: 14, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: "bold" }}>خاوەن پشک</div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: "#0f172a", marginTop: 4 }}>
                  {selectedAccount?.name || "دیاری نەکراوە"}
                </div>
              </div>

              <div style={{ background: "white", padding: 14, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: "bold" }}>قاسە</div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: "#0f172a", marginTop: 4 }}>
                  {selectedCashbox?.name || "دیاری نەکراوە"}
                </div>
              </div>

              <div style={{ background: "white", padding: 14, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: "bold" }}>بڕی پارە</div>
                <div style={{ fontSize: 18, fontWeight: "900", color: "#16a34a", marginTop: 4 }}>
                  {toNumber(amount) > 0 ? formatCurrencyAmount(toNumber(amount), currencyId) : "0"}
                </div>
                {isIQD && toNumber(amount) > 0 && (
                  <div style={{ fontSize: 13, color: "#2563eb", fontWeight: "bold", marginTop: 2 }}>
                    ≈ ${currentUsdEquivalent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>

            {isIQD && toNumber(amount) > 0 && (
              <div style={{ marginTop: 16, background: "#eff6ff", padding: "10px 14px", borderRadius: 8, border: "1px solid #bfdbfe", color: "#1e40af", fontSize: 13, fontWeight: "bold" }}>
                تێبینی خۆکارانەی پسووڵە: ({toNumber(amount).toLocaleString('en-US')} دینار بە ڕەیتی 100 دۆلاری {toNumber(exchangeRate).toLocaleString('en-US')} دیناری)
              </div>
            )}
          </div>
        </main>
      </div>

      <div id="cash-deposit-print-area" style={printArea}>
        <div style={printPage}>
          <PrintWatermark />
          <PrintHeader />

          {printOptions.showReceiptInfo && (
            <div style={printInfoGrid}>
              <div style={printInfoBox}>
                {printOptions.showReceiptNumber && (
                  <div style={printInfoRow}>
                    <strong>ژمارەی پسوڵە:</strong>
                    <span>{receiptNumber || "-"}</span>
                  </div>
                )}

                {printOptions.showReceiptDate && (
                  <div style={printInfoRow}>
                    <strong>بەروار:</strong>
                    <span>{formatDate(receiptDate)}</span>
                  </div>
                )}

                {printOptions.showCreatedTime && (
                  <div style={printInfoRow}>
                    <strong>کاتژمێر:</strong>
                    <span>{createdTime || "-"}</span>
                  </div>
                )}

                {printOptions.showCashbox && (
                  <div style={printInfoRow}>
                    <strong>قاسە:</strong>
                    <span>{selectedCashbox?.name || "-"}</span>
                  </div>
                )}
              </div>

              {printOptions.showShareholderInfo && (
                <div style={printInfoBox}>
                  {printOptions.showShareholderName && (
                    <div style={printInfoRow}>
                      <strong>خاوەن پشک:</strong>
                      <span>{selectedAccount?.name || "-"}</span>
                    </div>
                  )}

                  {printOptions.showShareholderPhone && (
                    <div style={printInfoRow}>
                      <strong>ژمارە:</strong>
                      <span>{selectedAccount?.phone || "-"}</span>
                    </div>
                  )}

                  {printOptions.showShareholderAddress && (
                    <div style={printInfoRow}>
                      <strong>ناونیشان:</strong>
                      <span>{selectedAccount?.address || "-"}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {printOptions.showEmployeeInfo && (
            <div style={printEmployeeBox}>
              <div style={printInfoRow}>
                <strong>کارمەند:</strong>
                <span>{employeeNameFromLogin || "-"}</span>
              </div>
              <div style={printInfoRow}>
                <strong>مۆبایل:</strong>
                <span>{employeePhoneFromLogin || "-"}</span>
              </div>
            </div>
          )}

          <div style={printBottomGrid}>
            <div style={printSummaryBox}>
              <PrintSummaryLine
                label="پارەی دانراو"
                value={
                  toNumber(amount) > 0
                    ? formatCurrencyAmountJSX(toNumber(amount), currencyId)
                    : "0"
                }
                bold
              />

              <PrintSummaryLine
                label="باڵانسی پشک پێشوو"
                value={formatCurrencyMap(shareholderBalanceByCurrency)}
              />

              <PrintSummaryLine
                label="باڵانسی پشک ئێستا"
                value={formatCurrencyMap(shareholderBalanceAfterByCurrency)}
                bold
              />
            </div>
          </div>

          {((printNote && printNote.trim() !== "") || (isIQD && toNumber(amount) > 0)) && (
            <div style={{
              marginTop: 12,
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "10px 14px",
              background: "white",
              fontSize: "12px",
              width: "100%",
              boxSizing: "border-box"
            }}>
              <b>تێبینی:</b>
              <div style={{ marginTop: 4, whiteSpace: "pre-line" }}>
                {isIQD && toNumber(amount) > 0 && !printNote.includes("بە ڕەیتی 100 دۆلاری") && (
                  `(${toNumber(amount).toLocaleString('en-US')} دینار بە ڕەیتی 100 دۆلاری ${toNumber(exchangeRate).toLocaleString('en-US')} دیناری)\n`
                )}
                {printNote}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewReceiptConfirm && (
        <div style={modalOverlay}>
          <div style={confirmBox}>
            <h2 style={{ marginTop: 0 }}>پسوڵەکەت خەزن نەکراوە</h2>

            <p style={confirmText}>
              داتاکانی ئەم پسوڵەیە هێشتا خەزن نەکراوە. دەتەوێت بگەڕێیتەوە بۆ
              پسوڵە، یان پسوڵەیەکی نوێ بکەیتەوە؟
            </p>

            <div style={confirmActions}>
              <button
                style={outlineBlueBtn}
                onClick={() => setShowNewReceiptConfirm(false)}
              >
                گەڕانەوە بۆ پسوڵە
              </button>

              <button
                style={dangerBtn}
                onClick={() => {
                  setShowNewReceiptConfirm(false);
                  resetReceipt();
                }}
              >
                پسوڵەی نوێ
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0 }}>ڕێکخستنی پسوڵە</h2>

              <button
                style={modalCloseBtn}
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>

            <div style={settingsStack}>
              <div style={{ ...settingsSection, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563", marginBottom: 6 }}>ڕێکخستنی زانیاری پسووڵە</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 8, border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#f9fafb" }}>
                    <SettingCheck
                      label="زانیاری پسوڵە دەرکەوێت"
                      checked={printOptions.showReceiptInfo}
                      onChange={() => togglePrintOption("showReceiptInfo")}
                    />
                    <SettingCheck
                      label="ژمارەی پسوڵە"
                      checked={printOptions.showReceiptNumber}
                      onChange={() => togglePrintOption("showReceiptNumber")}
                    />
                    <SettingCheck
                      label="بەروار"
                      checked={printOptions.showReceiptDate}
                      onChange={() => togglePrintOption("showReceiptDate")}
                    />
                    <SettingCheck
                      label="کاتژمێر"
                      checked={printOptions.showCreatedTime}
                      onChange={() => togglePrintOption("showCreatedTime")}
                    />
                    <SettingCheck
                      label="قاسە"
                      checked={printOptions.showCashbox}
                      onChange={() => togglePrintOption("showCashbox")}
                    />
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563", marginBottom: 6 }}>ڕێکخستنی زانیاری خاوەن پشک</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 8, border: "1px solid #e5e7eb", borderRadius: 6, backgroundColor: "#f9fafb" }}>
                    <SettingCheck
                      label="زانیاری خاوەن پشک"
                      checked={printOptions.showShareholderInfo}
                      onChange={() => togglePrintOption("showShareholderInfo")}
                    />
                    <SettingCheck
                      label="ناوی خاوەن پشک"
                      checked={printOptions.showShareholderName}
                      onChange={() => togglePrintOption("showShareholderName")}
                    />
                    <SettingCheck
                      label="ژمارەی خاوەن پشک"
                      checked={printOptions.showShareholderPhone}
                      onChange={() => togglePrintOption("showShareholderPhone")}
                    />
                    <SettingCheck
                      label="ناونیشانی خاوەن پشک"
                      checked={printOptions.showShareholderAddress}
                      onChange={() => togglePrintOption("showShareholderAddress")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={modalFooter}>
              <button
                style={primaryBtn}
                onClick={() => setShowSettings(false)}
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </label>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={infoRow}>
      <div style={infoKey}>{label}</div>
      <div style={infoVal}>{children}</div>
    </div>
  );
}

function StatBox({
  title,
  value,
  color,
}: {
  title: string;
  value: ReactNode;
  color?: string;
}) {
  return (
    <div style={statBox}>
      <div style={{ color: "#374151", fontWeight: 700 }}>{title}</div>
      <div style={{ color, fontWeight: 900, fontSize: 20, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function PrintSummaryLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: ReactNode;
  bold?: boolean;
}) {
  return (
    <div style={printSummaryLine}>
      <span style={{ fontWeight: bold ? "bold" : "normal" }}>{label}:</span>
      <span style={{ fontWeight: bold ? "bold" : "normal" }}>{value}</span>
    </div>
  );
}

function SettingCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label style={settingCheck}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

const appFont = '"Speda", "Segoe UI", Tahoma, Arial, sans-serif';

const page: CSSProperties = {
  direction: "rtl",
  fontFamily: appFont,
  padding: 16,
  maxWidth: 1600,
  margin: "0 auto",
  background: "#f8fafc",
  minHeight: "100vh",
};

const topBar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  gap: 12,
  flexWrap: "wrap",
};

const topBarActions: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const baseBtn: CSSProperties = {
  fontFamily: appFont,
  fontSize: 14,
  fontWeight: 700,
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s",
};

const saveBtn: CSSProperties = {
  ...baseBtn,
  background: "#16a34a",
  color: "white",
};

const printBtn: CSSProperties = {
  ...baseBtn,
  background: "#0284c7",
  color: "white",
};

const newReceiptBtn: CSSProperties = {
  ...baseBtn,
  background: "#4f46e5",
  color: "white",
};

const settingsBtn: CSSProperties = {
  ...baseBtn,
  background: "#475569",
  color: "white",
};

const primaryBtn: CSSProperties = {
  ...baseBtn,
  background: "#2563eb",
  color: "white",
};

const outlineBlueBtn: CSSProperties = {
  ...baseBtn,
  background: "white",
  color: "#2563eb",
  border: "1px solid #2563eb",
};

const dangerBtn: CSSProperties = {
  ...baseBtn,
  background: "#dc2626",
  color: "white",
};

const workspaceGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "360px 1fr",
  gap: 16,
  alignItems: "start",
};

const rightSidebar: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const mainContent: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const accountSearchBox: CSSProperties = {
  position: "relative",
};

const accountDropdown: CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  left: 0,
  background: "white",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  maxHeight: 220,
  overflowY: "auto",
  zIndex: 50,
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  marginTop: 4,
};

const dropdownItem: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  textAlign: "right",
  background: "none",
  border: "none",
  borderBottom: "1px solid #f1f5f9",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  fontFamily: appFont,
};

const smallMuted: CSSProperties = {
  fontSize: 11,
  color: "#64748b",
};

const noteToggleBtn: CSSProperties = {
  background: "none",
  border: "1px dashed #cbd5e1",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  cursor: "pointer",
  width: "100%",
  fontFamily: appFont,
};

const accountCard: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const infoRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 13,
  borderBottom: "1px solid #f8fafc",
  paddingBottom: 4,
};

const infoKey: CSSProperties = {
  color: "#64748b",
  fontWeight: 600,
};

const infoVal: CSSProperties = {
  fontWeight: 700,
  color: "#1e293b",
};

const totalsCard: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const totalGridSingle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
};

const statBox: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 12,
  textAlign: "center",
};

const twoCol: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  marginBottom: 4,
};

const input: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  fontFamily: appFont,
  boxSizing: "border-box",
  background: "white",
};

const textarea: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  fontFamily: appFont,
  boxSizing: "border-box",
  resize: "vertical",
};

const noteToggleBox: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const notesInsidePayment: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 4,
};

const toast: CSSProperties = {
  position: "fixed",
  bottom: 24,
  left: 24,
  color: "white",
  padding: "12px 20px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 14,
  zIndex: 9999,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const printArea: CSSProperties = {
  display: "none",
};

const printPage: CSSProperties = {
  width: "100%",
  minHeight: "auto",
  background: "white",
  padding: "0 4mm 4mm 4mm",
  boxSizing: "border-box",
  direction: "rtl",
  fontFamily: appFont,
  color: "#111827",
  position: "relative",
};

const printInfoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 8,
  marginBottom: 8,
};

const printInfoBox: CSSProperties = {
  border: "1px solid #d1d5db",
  padding: 8,
  fontSize: 11,
  minHeight: 54,
  backgroundColor: "#f9fafb",
  borderRadius: 4,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const printEmployeeBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: 8,
  fontSize: 11,
  marginBottom: 8,
  background: "#fafafa",
};

const printInfoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "85px 1fr",
  gap: 8,
  alignItems: "center",
  lineHeight: 1.8,
};

const printBottomGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 0,
  marginTop: 8,
};

const printSummaryBox: CSSProperties = {
  border: "1px solid #cbd5e1",
  padding: 0,
  minHeight: 40,
  fontSize: 12,
};

const printSummaryLine: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "110px 1fr",
  gap: 8,
  alignItems: "center",
  borderBottom: "1px solid #f1f5f9",
  padding: "4px 0",
};

const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalBox: CSSProperties = {
  width: 760,
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "white",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 25px 70px rgba(15,23,42,0.25)",
};

const confirmBox: CSSProperties = {
  width: 460,
  maxWidth: "92vw",
  background: "white",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 25px 70px rgba(15,23,42,0.28)",
};

const confirmText: CSSProperties = {
  color: "#374151",
  lineHeight: 1.9,
  fontWeight: 700,
  marginBottom: 18,
};

const confirmActions: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 12,
};

const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: 12,
  marginBottom: 14,
};

const modalCloseBtn: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "1px solid #d1d5db",
  background: "white",
  fontSize: 20,
  cursor: "pointer",
};

const settingsStack: CSSProperties = {
  display: "grid",
  gap: 12,
};

const settingsSection: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  background: "#fafafa",
};

const settingCheck: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid #f1f5f9",
  fontWeight: 700,
};

const emptyMainCard: CSSProperties = { minHeight: 160, background: "#f3f4f6", borderRadius: 14, padding: 30, textAlign: "right" };
const viewBtn: CSSProperties = { background: "#1e3a8a", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: "bold" };

const modalFooter: CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-start",
};