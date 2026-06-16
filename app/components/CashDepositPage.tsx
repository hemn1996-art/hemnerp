"use client";
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
import { saveInvoice } from "../utils/invoiceLogic";
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
            
            const amt = voucher.totalAmount ?? voucher.amount;
            if (amt) setAmount(String(amt));
            if (voucher.currencyId) setCurrencyId(voucher.currencyId);

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading voucher:", err)).finally(() => setIsEditLoading(false));
    }
  }, [editId, accounts]);

  const [accountSearch, setAccountSearch] = useState("");
  const [accountId, setAccountId] = useState<number | undefined>();
  const [showAccountList, setShowAccountList] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  const [cashboxId, setCashboxId] = useState<number | undefined>(
    cashboxes[0]?.id
  );

  const [amount, setAmount] = useState("");
  const [currencyId, setCurrencyId] = useState<number>(defaultCurrency.id);

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

  useEffect(() => {
    setReceiptNumber(Date.now().toString().slice(-6));
    setCreatedTime(
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setReceiptDate(new Date().toISOString().slice(0, 10));
  }, []);

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

  function onlyDecimal(value: string) {
    const cleaned = value.replace(/[^\d.]/g, "");
    const firstDot = cleaned.indexOf(".");

    if (firstDot === -1) return cleaned;

    return (
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "")
    );
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
    if (getCurrencyCode(id) === "IQD") {
      return `${Number(value || 0).toLocaleString("en-US")} دینار`;
    }
    return `${Number(value || 0).toLocaleString("en-US")} ${getCurrencySymbol(id)}`;
  }

  function formatCurrencyMap(map: Record<string, number>) {
    const parts = Object.entries(map)
      .filter(([, value]) => Math.abs(Number(value || 0)) > 0.0001)
      .map(([currencyIdText, value]) =>
        formatCurrencyAmount(Number(value || 0), Number(currencyIdText))
      );

    return parts.length ? parts.join(" + ") : "0";
  }

  function formatDate(dateText: string) {
    if (!dateText) return "-";
    const [year, month, day] = dateText.split("-");
    return `${day}/${month}/${year}`;
  }

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
      result[String(defaultCurrency.id)] = Number(
        account.shareholderBalance || 0
      );
    }

    return result;
  }

  function getShareholderBalanceAfter(baseMap: Record<string, number>) {
    const result: Record<string, number> = { ...baseMap };

    result[String(currencyId)] = Number(result[String(currencyId)] || 0) + toNumber(amount);

    return result;
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

    const depositAmount = toNumber(amount);

    if (!account.shareholderBalanceByCurrency) {
      account.shareholderBalanceByCurrency = {};
    }

    account.shareholderBalanceByCurrency[String(currencyId)] =
      Number(account.shareholderBalanceByCurrency[String(currencyId)] || 0) +
      depositAmount;

    if (typeof account.shareholderBalance === "number") {
      account.shareholderBalance =
        Number(account.shareholderBalance || 0) + depositAmount;
    } else {
      account.shareholderBalance = depositAmount;
    }
  }

  function resetReceipt() {
    setReceiptNumber(Date.now().toString().slice(-6));

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

    setCashboxId(cashboxes[0]?.id);
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

    const shareholderBalanceChangeAtSave = {
      [String(currencyId)]: toNumber(amount),
    };

    const shareholderBalanceAfterAtSave = {
      ...shareholderBalanceBeforeAtSave,
      [String(currencyId)]:
        Number(shareholderBalanceBeforeAtSave[String(currencyId)] || 0) + toNumber(amount),
    };

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
          return new Date(`${dateStr}T${hours}:${minutes}:00Z`).toISOString();
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

    const payload = {
      type: "shareholder_deposit",
      referenceNo: receiptNumber,
      date: combineDateAndTime(receiptDate, createdTime),
      accountId: accountId ? Number(accountId) : null,
      cashboxId: cashboxId ? Number(cashboxId) : null,
      currencyId: Number(currencyId),
      exchangeRate: 1,
      totalAmount: toNumber(amount),
      netAmount: 0,
      internalNote: receiptNote,
      printNote,
      paidAmounts: [
        {
          currencyId: Number(currencyId),
          amount: toNumber(amount),
          exchangeRate: 1
        }
      ],
      employeeName: employeeNameFromLogin,
    };

    setIsSaving(true);
    const savePromise = editId
      ? updateVoucher(Number(editId), payload)
      : addVoucher(payload);

    savePromise
      .then((res: any) => {
        if (res) {
          if (!editId) {
            applyCashboxIncrease();
            applyShareholderBalanceIncrease();
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

    setTimeout(() => window.print(), 100);
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
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(2px)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "all"
        }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "5px solid #e5e7eb",
            borderTop: "5px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "12px"
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <span style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
            باردەکرێت...
          </span>
        </div>
      )}
      <style>{printCss}</style>

      {toastMessage && (
        <div
          style={{
            ...toastBar,
            ...(toastType === "success"
              ? toastSuccess
              : toastType === "info"
              ? toastInfo
              : toastError),
          }}
        >
          <button style={toastCloseBtn} onClick={() => setToastMessage("")}>
            ×
          </button>

          <span>{toastMessage}</span>
        </div>
      )}

      <div style={pageGrid} className="no-print">
        <aside style={leftPanel}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <label style={labelStyle}>هەژماری خاوەن پشک</label>

            <div style={accountInputWrap}>
              <input
                value={accountSearch}
                disabled={isLocked}
                onFocus={() => {
                  if (!isLocked) setShowAccountList(true);
                }}
                onChange={(event) => {
                  if (blockIfLocked()) return;
                  setAccountSearch(event.target.value);
                  setAccountId(undefined);
                  setShowAccountList(true);
                  setShowAccountInfo(false);
                }}
                placeholder="تەنها هەژماری خاوەن پشک..."
                style={{
                  ...input,
                  ...lockedFieldStyle,
                  paddingLeft: accountId && !isLocked ? 44 : 14,
                }}
              />

              {accountId && !isLocked && (
                <button
                  type="button"
                  style={accountClearBtn}
                  onClick={() => {
                    setAccountId(undefined);
                    setAccountSearch("");
                    setShowAccountInfo(false);
                    setShowAccountList(false);
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {showAccountList && !isLocked && shareholderAccounts.length > 0 && (
              <div style={dropdownLarge}>
                {shareholderAccounts.map((account: any) => (
                  <button
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
                  style={{ ...input, ...lockedFieldStyle , minWidth: "130px" }}
                >
                  {currencies.map((currency: any) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

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
                      rows={3}
                      style={{ ...textarea, ...lockedFieldStyle }}
                    />
                  </Field>

                  <Field label="تێبینی چاپ">
                    <textarea
                      value={printNote}
                      disabled={isLocked}
                      onChange={(event) => {
                        if (blockIfLocked()) return;
                        setPrintNote(event.target.value);
                      }}
                      rows={3}
                      style={{ ...textarea, ...lockedFieldStyle }}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>

          <div style={sideActions}>
            <button style={outlineBlueBtn} onClick={handleNewReceipt}>
              پسوڵەی نوێ
            </button>

            <button
              style={{
                ...primaryBtn,
                opacity: (isLocked || (!!editId && isSaved) || isSaving) ? 0.55 : 1,
                cursor: (isLocked || (!!editId && isSaved) || isSaving) ? "not-allowed" : "pointer",
              }}
              onClick={handleSave}
              disabled={isLocked || (!!editId && isSaved) || isSaving}
            >
              {isSaving ? "چاوەڕوانبە..." : isLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}
            </button>

            <button style={outlineBlueBtn} onClick={() => setShowSettings(true)}>
              ڕێکخستن
            </button>

            <button style={printBtn} onClick={handlePrint}>
              پرێنتکردن
            </button>
          </div>

          {!isSaved && hasUnsavedData() && !isLocked && (
            <div style={unsavedNotice}>ئەم پسوڵەیە هێشتا خەزن نەکراوە.</div>
          )}

          {isLocked && (
            <div style={lockedNotice}>
              پسوڵەکە قوفڵ کراوە؛ تەنها پرێنت، ڕێکخستن و پسوڵەی نوێ کار دەکات.
            </div>
          )}
        </aside>

        <main style={mainContent}>
          <div style={headerCard}>
            {headerSelector ? headerSelector : <h2 style={{ margin: 0 }}>پسوڵەی دانانی پارە</h2>}

            
          </div>

          <div style={emptyMainCard}>
            <h2 style={{ marginTop: 0 }}>پسوڵەی هاوپێچکراو</h2>
            <button style={viewBtn}>بینین</button>
          </div>
        </main>
      </div>

      <div id="cash-deposit-print-area" style={printArea}>
        <div style={printPage}>
          <PrintWatermark />
          <PrintHeader />

                    {(printOptions.showReceiptInfo || printOptions.showShareholderInfo) && (
            <div style={printInfoGrid}>
              {/* Right Column: Invoice Info Box */}
              {printOptions.showReceiptInfo ? (
                <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                  <PrintInfoLine
                  label="جۆری پسوڵە"
                  value="پسوڵەی دانانی پارە"
                />
                  <PrintInfoLine label="ژمارەی پسوڵە" value={receiptNumber} />
                  <PrintInfoLine
                    label="بەروار"
                    value={formatDate(receiptDate)}
                  />
                  <PrintInfoLine label="کاتژمێر" value={createdTime} />
                  <PrintInfoLine
                    label="قاسە"
                    value={selectedCashbox?.name || "-"}
                  />
                </div>
              ) : (
                <div />
              )}

              {/* Left Column: Stack of Account Info & Employee Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                {printOptions.showShareholderInfo && (
                  <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                    <PrintInfoLine
                    label="خاوەن پشک"
                    value={selectedAccount?.name || "-"}
                  />
                    <PrintInfoLine
                    label="ژمارە"
                    value={selectedAccount?.phone || "-"}
                  />
                    <PrintInfoLine
                    label="ناونیشان"
                    value={
                      [selectedAccount?.city, selectedAccount?.address]
                        .filter(Boolean)
                        .join(" - ") || "-"
                    }
                  />
                  </div>
                )}

                {/* Employee Info Box */}
                {printOptions.showEmployeeInfo && (employeeNameFromLogin?.trim() !== "" || employeePhoneFromLogin?.trim() !== "") && (
                  <div style={{ ...printInfoBox, width: "100%", minWidth: "220px" }}>
                                        {employeeNameFromLogin?.trim() !== "" && (
                      <PrintInfoLine
                        label="کارمەند"
                        value={employeeNameFromLogin}
                      />
                    )}
                    {employeePhoneFromLogin?.trim() !== "" && (
                      <PrintInfoLine
                        label="مۆبایل"
                        value={employeePhoneFromLogin}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          

          <div style={printBottomGrid}>
  <div style={printSummaryBox}>
    <PrintSummaryLine
      label="پارەی دانراو"
      value={
        toNumber(amount) > 0
          ? formatCurrencyAmount(toNumber(amount), currencyId)
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

          {printNote && printNote.trim() !== "" && (
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
              <div style={{ marginTop: 4, whiteSpace: "pre-line" }}>{printNote}</div>
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

              <div style={settingsSection}>
                <h3 style={settingsTitle}>کارمەند / ئامادەکار</h3>

                <SettingCheck
                  label="زانیاری کارمەند لە چاپ دەرکەوێت"
                  checked={printOptions.showEmployeeInfo}
                  onChange={() => togglePrintOption("showEmployeeInfo")}
                />

                <div style={employeePreviewBox}>
                  <div>
                    <b>ناوی کارمەند:</b>{" "}
                    {employeeNameFromLogin.trim() ||
                      "لە ئەکاونتی کارمەنددا نییە"}
                  </div>

                  <div>
                    <b>مۆبایل:</b>{" "}
                    {employeePhoneFromLogin.trim() ||
                      "لە ئەکاونتی کارمەنددا نییە"}
                  </div>
                </div>
              </div>
            </div>

            <div style={modalFooter}>
              <button style={primaryBtn} onClick={() => setShowSettings(false)}>
                تەواو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </label>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
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
  value: string;
  color: string;
}) {
  return (
    <div style={statBox}>
      <div style={{ color: "#374151", fontWeight: 700 }}>{title}</div>
      <div style={{ color, fontWeight: 900, fontSize: 18, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function PrintInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={printInfoRow}>
      <b>{label}:</b>
      <span>{value}</span>
    </div>
  );
}

function PrintSummaryLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  let hideZero = false;
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("general_settings");
    if (saved) {
      try {
        hideZero = !!JSON.parse(saved).hideZeroBalance;
      } catch (e) {}
    }
  }

  if (hideZero) {
    const clean = (value || "").replace(/[$,\s\-\+]|دینار|د\.ع/g, "");
    if (clean === "0" || clean === "" || Number(clean) === 0) {
      return null;
    }
  }

  return (
    <div style={{ ...printSummaryLine, justifyContent: "flex-start", gap: "8px" }}>
      <span style={{ display: "inline-block", width: "135px", fontWeight: bold ? 900 : 700, textAlign: "right" }}>{label}</span>
      <span style={{ fontWeight: bold ? 900 : 500 }}>{value}</span>
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
      {label}
    </label>
  );
}

const appFont = '"Speda", "Segoe UI", Tahoma, Arial, sans-serif';

const printCss = `
@media print {
  @page { size: auto; margin: 0 !important; }

  body * { visibility: hidden !important; }

  #cash-deposit-print-area,
  #cash-deposit-print-area * {
    visibility: visible !important;
  }

  #cash-deposit-print-area {
    display: block !important;
    position: relative !important;
    width: 100% !important;
    min-height: auto !important;
    background: white !important;
    z-index: 999999 !important;
  }

  button,
  input,
  select,
  textarea {
    display: none !important;
  }
}
`;

const page: CSSProperties = { direction: "rtl", fontFamily: appFont };

const toastBar: CSSProperties = {
  position: "fixed",
  top: 10,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 99999,
  minWidth: 360,
  maxWidth: "80vw",
  padding: "12px 18px",
  borderRadius: 8,
  color: "white",
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  boxShadow: "0 10px 30px rgba(15,23,42,0.25)",
  textAlign: "center",
};

const toastError: CSSProperties = { background: "#ef4444" };
const toastSuccess: CSSProperties = { background: "#16a34a" };
const toastInfo: CSSProperties = { background: "#2563eb" };

const toastCloseBtn: CSSProperties = {
  border: 0,
  background: "transparent",
  color: "white",
  fontSize: 26,
  lineHeight: 1,
  cursor: "pointer",
  fontWeight: 900,
};

const pageGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--page-grid-cols-no-items, 1000px 1fr)",
  gap: 18,
  alignItems: "stretch",
};

const leftPanel: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
  position: "var(--left-panel-position, sticky)" as any,
  top: 16,
};

const mainContent: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
};

const input: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 15,
  outline: "none",
  background: "white",
  boxSizing: "border-box",
  fontFamily: appFont,
};

const textarea: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 15,
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
  fontFamily: appFont,
};

const labelStyle: CSSProperties = {
  marginBottom: 6,
  fontWeight: 700,
  color: "#374151",
};

const accountInputWrap: CSSProperties = {
  position: "relative",
  width: "100%",
};

const accountClearBtn: CSSProperties = {
  position: "absolute",
  left: 8,
  top: "50%",
  transform: "translateY(-50%)",
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid #fecaca",
  background: "#fee2e2",
  color: "#dc2626",
  fontSize: 20,
  fontWeight: 900,
  lineHeight: "24px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: appFont,
  zIndex: 5,
};

const dropdownLarge: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  marginTop: 6,
  background: "white",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  boxShadow: "0 14px 35px rgba(15,23,42,0.12)",
  zIndex: 80,
  maxHeight: "70vh",
  overflowY: "auto",
};

const dropdownItem: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "right",
  border: 0,
  background: "white",
  padding: 12,
  cursor: "pointer",
  borderBottom: "1px solid #f1f5f9",
  fontFamily: appFont,
};

const smallMuted: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#6b7280",
  marginTop: 4,
};

const accountCard: CSSProperties = {
  background: "#fafafa",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  marginTop: 12,
  marginBottom: 14,
};

const infoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "110px 1fr",
  gap: 8,
  padding: "7px 0",
  borderBottom: "1px solid #e5e7eb",
};

const infoKey: CSSProperties = {
  fontWeight: 700,
  color: "#374151",
};

const infoVal: CSSProperties = {
  color: "#111827",
};

const totalsCard: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const totalGridSingle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
};

const statBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  background: "#fbfbfb",
};

const twoCol: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 12,
};

const noteToggleBox: CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  paddingTop: 10,
};

const noteToggleBtn: CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  color: "#374151",
  borderRadius: 12,
  padding: "12px",
  fontWeight: 800,
  cursor: "pointer",
  textAlign: "center",
  fontFamily: appFont,
};

const notesInsidePayment: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
  marginTop: 12,
};

const sideActions: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 10,
  marginTop: 14,
};

const outlineBlueBtn: CSSProperties = {
  borderRadius: 12,
  border: "1px solid #2563eb",
  background: "white",
  color: "#2563eb",
  padding: "12px",
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: appFont,
};

const primaryBtn: CSSProperties = {
  borderRadius: 12,
  border: 0,
  background: "#2563eb",
  color: "white",
  padding: "12px",
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: appFont,
};

const printBtn: CSSProperties = {
  borderRadius: 12,
  border: 0,
  background: "#22c55e",
  color: "white",
  padding: "12px",
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: appFont,
};

const dangerBtn: CSSProperties = {
  borderRadius: 12,
  border: 0,
  background: "#dc2626",
  color: "white",
  padding: "12px",
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: appFont,
};

const unsavedNotice: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fde68a",
  fontWeight: 800,
  textAlign: "center",
};

const lockedNotice: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#e0f2fe",
  color: "#075985",
  border: "1px solid #bae6fd",
  fontWeight: 900,
  textAlign: "center",
};

const headerCard: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const currentBadge: CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  padding: "7px 14px",
  fontWeight: 800,
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

const printHeaderBlankSpace: CSSProperties = {
  height: "60mm",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: 8,
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
  gap: 8,
  marginTop: 8,
};

const printSummaryBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: 8,
  minHeight: 70,
  fontSize: 11,
};

const printSummaryLine: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "90px 1fr",
  gap: 8,
  alignItems: "center",
  borderBottom: "1px solid #f1f5f9",
  padding: "4px 0",
};

const printNoteBox: CSSProperties = {
  marginTop: 8,
  border: "1px solid #e5e7eb",
  padding: 8,
  fontSize: 10,
  lineHeight: 1.8,
  background: "#f8fafc",
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

const settingsTitle: CSSProperties = {
  margin: "0 0 10px",
};

const settingGrid2: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 8,
};

const settingCheck: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid #f1f5f9",
  fontWeight: 700,
};

const employeePreviewBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#ffffff",
  padding: 12,
  lineHeight: 2,
  color: "#374151",
};

const emptyMainCard: CSSProperties = { minHeight: 160, background: "#f3f4f6", borderRadius: 14, padding: 30, textAlign: "right" };
const viewBtn: CSSProperties = { background: "#1e3a8a", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: "bold" };

const modalFooter: CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-start",
};