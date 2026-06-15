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

import { store, useStore } from "../store/store";
import { saveInvoice } from "../utils/invoiceLogic";
import { currencies as mockCurrencies } from "../data/mockData";

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
  showAccountInfo: boolean;
  showAccountName: boolean;
  showAccountPhone: boolean;
  showAccountAddress: boolean;
  showEmployeeInfo: boolean;
};

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function MyDebtPage({ headerSelector, editId }: Props) {
  const [isEditLoading, setIsEditLoading] = useState(!!editId);

  useEffect(() => {
    setIsEditLoading(!!editId);
    if (editId) {
      setSavedSnapshot("");
    }
  }, [editId]);

  const accounts = (store.accounts || []) as AccountLike[];
  const addVoucher = useStore((s) => s.addVoucher);
  const storeCurrencies = useStore((s: any) => s.currencies) || [];
  const fetchCurrencies = useStore((s: any) => s.fetchCurrencies);
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;
  const updateVoucher = useStore((s) => s.updateVoucher);

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
            
            let loadedAmount = voucher.netAmount;
            let loadedCurrencyId = voucher.currencyId;

            // Fallback for vouchers that were saved with zero values
            if ((!loadedAmount || loadedAmount === 0 || !loadedCurrencyId) && voucher.versions && voucher.versions.length > 0) {
              try {
                const latestVer = voucher.versions[voucher.versions.length - 1];
                const parsedData = JSON.parse(latestVer.data);
                if (parsedData) {
                  if (parsedData.debtAmount !== undefined && parsedData.debtAmount !== null && Number(parsedData.debtAmount) !== 0) {
                    loadedAmount = Number(parsedData.debtAmount);
                  } else if (parsedData.netAmount !== undefined && parsedData.netAmount !== null && Number(parsedData.netAmount) !== 0) {
                    loadedAmount = Number(parsedData.netAmount);
                  } else if (parsedData.total !== undefined && parsedData.total !== null && Number(parsedData.total) !== 0) {
                    loadedAmount = Number(parsedData.total);
                  }
                  
                  if (parsedData.debtCurrencyId) {
                    loadedCurrencyId = Number(parsedData.debtCurrencyId);
                  } else if (parsedData.currencyId) {
                    loadedCurrencyId = Number(parsedData.currencyId);
                  }
                }
              } catch (e) {
                console.error("Error loading version fallback data:", e);
              }
            }

            if (loadedAmount !== undefined && loadedAmount !== null) setDebtAmount(String(loadedAmount));
            if (loadedCurrencyId !== undefined && loadedCurrencyId !== null) setDebtCurrencyId(loadedCurrencyId);
            if (voucher.exchangeRate) setExchangeRate(String(voucher.exchangeRate * 100));

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

  const [debtAmount, setDebtAmount] = useState("");
  const [debtCurrencyId, setDebtCurrencyId] = useState<number>(
    defaultCurrency.id
  );
  const [exchangeRate, setExchangeRate] = useState("150000");

  const [receiptNote, setReceiptNote] = useState("");
  const [printNote, setPrintNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showNewReceiptConfirm, setShowNewReceiptConfirm] = useState(false);

  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    showReceiptInfo: true,
    showReceiptNumber: true,
    showReceiptDate: true,
    showCreatedTime: true,
    showAccountInfo: true,
    showAccountName: true,
    showAccountPhone: true,
    showAccountAddress: true,
    showEmployeeInfo: false,
  });

  const selectedAccount = accounts.find((a: any) => a.id === accountId);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();

    const activeAccounts = accounts.filter(
      (account: any) => account.isActive !== false
    );

    if (!q) return activeAccounts;

    return activeAccounts.filter((account: any) => {
      return (
        String(account.name || "").toLowerCase().includes(q) ||
        String(account.phone || "").toLowerCase().includes(q) ||
        String(account.city || "").toLowerCase().includes(q)
      );
    });
  }, [accountSearch, accounts]);

  const hasIqdDebt = getCurrencyCode(debtCurrencyId) === "IQD";

  const accountBalanceBeforeByCurrency =
    getAccountBalanceBeforeMap(selectedAccount);

  const accountBalanceChangeByCurrency = getAccountBalanceChangeByCurrency();

  const accountBalanceAfterByCurrency = addMoneyMap(
    accountBalanceBeforeByCurrency,
    accountBalanceChangeByCurrency
  );

  const debtInDefaultCurrency = convertCurrency(
    toNumber(debtAmount),
    debtCurrencyId,
    defaultCurrency.id
  );

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      accountId,
      accountSearch,
      receiptDate,
      createdTime,
      debtAmount,
      debtCurrencyId,
      exchangeRate,
      receiptNote,
      printNote,
      printOptions,
    });
  }, [
    accountId,
    accountSearch,
    receiptDate,
    createdTime,
    debtAmount,
    debtCurrencyId,
    exchangeRate,
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

  function onlyInteger(value: string) {
    return value.replace(/[^\d]/g, "");
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

  function getCurrencySymbol(currencyId?: number) {
    return currencies.find((c: any) => c.id === currencyId)?.symbol || "$";
  }

  function getCurrencyCode(currencyId?: number) {
    return currencies.find((c: any) => c.id === currencyId)?.code || "";
  }

  function isUsd(currencyId: number) {
    return getCurrencyCode(currencyId) === "USD";
  }

  function isIqd(currencyId: number) {
    return getCurrencyCode(currencyId) === "IQD";
  }

  function convertCurrency(amount: number, fromId: number, toId: number) {
    if (fromId === toId) return amount;

    const rate = (toNumber(exchangeRate) / 100) || 1500;

    if (isIqd(fromId) && isUsd(toId)) return amount / rate;
    if (isUsd(fromId) && isIqd(toId)) return amount * rate;

    return amount;
  }

  function formatCurrencyAmount(value: number, currencyId: number) {
    const code = getCurrencyCode(currencyId);
    const symbol = getCurrencySymbol(currencyId);

    if (code === "IQD") {
      return `${Number(value || 0).toLocaleString("en-US")} دینار`;
    }

    return `${Number(value || 0).toLocaleString("en-US")} ${symbol}`;
  }

  function formatCurrencyMap(map: Record<string, number>) {
    const parts = Object.entries(map)
      .filter(([, amount]) => Math.abs(Number(amount || 0)) > 0.0001)
      .map(([currencyIdText, amount]) =>
        formatCurrencyAmount(amount, Number(currencyIdText))
      );

    return parts.length ? parts.join(" + ") : "0";
  }

  function formatBalanceColor(map: Record<string, number>) {
    const totalInDefault = Object.entries(map).reduce(
      (sum, [currencyIdText, amount]) => {
        return (
          sum +
          convertCurrency(
            Number(amount || 0),
            Number(currencyIdText),
            defaultCurrency.id
          )
        );
      },
      0
    );

    if (totalInDefault > 0) return "#16a34a";
    if (totalInDefault < 0) return "#dc2626";
    return "#111827";
  }

  function formatDate(dateText: string) {
    if (!dateText) return "-";

    const [year, month, day] = dateText.split("-");
    return `${day}/${month}/${year}`;
  }

  function getSingleAccountBalanceCurrencyId(account?: AccountLike) {
    if (!account?.balanceByCurrency) {
      return account?.balanceCurrencyId || account?.creditLimitCurrencyId;
    }

    const activeCurrencies = Object.entries(account.balanceByCurrency)
      .filter(([, amount]) => Math.abs(Number(amount || 0)) > 0.0001)
      .map(([currencyIdText]) => Number(currencyIdText));

    if (activeCurrencies.length === 1) return activeCurrencies[0];

    return account.balanceCurrencyId || account.creditLimitCurrencyId;
  }

  function normalizeMoneyMapToSingleCurrency(
    map: Record<string, number>,
    targetCurrencyId?: number
  ) {
    if (!targetCurrencyId) return map;

    const result: Record<string, number> = { [String(targetCurrencyId)]: 0 };

    for (const [currencyIdText, amount] of Object.entries(map)) {
      const fromCurrencyId = Number(currencyIdText);

      result[String(targetCurrencyId)] += convertCurrency(
        Number(amount || 0),
        fromCurrencyId,
        targetCurrencyId
      );
    }

    return result;
  }

  function getAccountBalanceBeforeMap(account?: AccountLike) {
    const map: Record<string, number> = {};

    if (!account) return map;

    if (account.balanceByCurrency) {
      for (const [currencyIdText, amount] of Object.entries(
        account.balanceByCurrency
      )) {
        const n = Number(amount || 0);

        if (Math.abs(n) > 0.0001) {
          map[currencyIdText] = n;
        }
      }
    }

    if (Object.keys(map).length === 0 && typeof account.balance === "number") {
      const balanceCurrencyId =
        account.balanceCurrencyId ||
        account.creditLimitCurrencyId ||
        defaultCurrency.id;

      map[String(balanceCurrencyId)] = Number(account.balance || 0);
    }

    return map;
  }

  function addMoneyMap(
    baseMap: Record<string, number>,
    addMap: Record<string, number>
  ) {
    const result: Record<string, number> = { ...baseMap };

    for (const [currencyIdText, amount] of Object.entries(addMap)) {
      result[currencyIdText] =
        Number(result[currencyIdText] || 0) + Number(amount || 0);
    }

    return result;
  }

  function getDebtByCurrency() {
    if (toNumber(debtAmount) <= 0) return {};

    return {
      [String(debtCurrencyId)]: toNumber(debtAmount),
    };
  }

  function getAccountBalanceChangeByCurrency() {
    const balanceCurrencyId = getSingleAccountBalanceCurrencyId(selectedAccount);

    const normalized = normalizeMoneyMapToSingleCurrency(
      getDebtByCurrency(),
      balanceCurrencyId
    );

    const result: Record<string, number> = {};

    for (const [currencyIdText, amount] of Object.entries(normalized)) {
      result[currencyIdText] = -Number(amount || 0);
    }

    return result;
  }

  function validateBeforeSave() {
    if (!accountId) {
      showToast("پسوڵەی من قەرزارم نابێت بێ هەژمار خەزن بکرێت.");
      return false;
    }

    if (toNumber(debtAmount) <= 0) {
      showToast("تکایە بڕی قەرز داغڵ بکە.");
      return false;
    }

    return true;
  }

  function applyAccountBalanceDecrease() {
    if (!accountId) return;

    const account = accounts.find((a: any) => a.id === accountId);
    if (!account) return;

    const changeMap = getAccountBalanceChangeByCurrency();
    const balanceCurrencyId = getSingleAccountBalanceCurrencyId(account);

    if (account.balanceByCurrency) {
      for (const [currencyIdText, amount] of Object.entries(changeMap)) {
        account.balanceByCurrency[currencyIdText] =
          Number(account.balanceByCurrency[currencyIdText] || 0) +
          Number(amount || 0);
      }
    }

    if (typeof account.balance === "number") {
      const targetCurrencyId =
        balanceCurrencyId ||
        account.balanceCurrencyId ||
        account.creditLimitCurrencyId ||
        defaultCurrency.id;

      const changeInBalanceCurrency = Object.entries(changeMap).reduce(
        (sum, [currencyIdText, amount]) => {
          return (
            sum +
            convertCurrency(
              Number(amount || 0),
              Number(currencyIdText),
              targetCurrencyId
            )
          );
        },
        0
      );

      account.balance = Number(account.balance || 0) + changeInBalanceCurrency;
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
    setShowAccountInfo(false);
    setShowAccountList(false);
    setDebtAmount("");
    setDebtCurrencyId(defaultCurrency.id);
    setExchangeRate("150000");
    setReceiptNote("");
    setPrintNote("");
    setShowNotes(false);
    setSavedSnapshot("");
    setIsLocked(false);
  }

  function hasUnsavedData() {
    return (
      accountId !== undefined ||
      accountSearch.trim() !== "" ||
      debtAmount.trim() !== "" ||
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

    const balanceBeforeAtSave = getAccountBalanceBeforeMap(selectedAccount);
    const balanceChangeAtSave = getAccountBalanceChangeByCurrency();
    const balanceAfterAtSave = addMoneyMap(
      balanceBeforeAtSave,
      balanceChangeAtSave
    );

    const payload = {
      type: "من قەرزارم",
      referenceNo: String(receiptNumber),
      date: new Date(receiptDate).toISOString(),
      accountId,
      currencyId: debtCurrencyId,
      exchangeRate: toNumber(exchangeRate) || 1500,
      totalAmount: toNumber(debtAmount),
      totalDiscount: 0,
      netAmount: toNumber(debtAmount),
      internalNote: receiptNote,
      printNote,
      employeeName: employeeNameFromLogin,
      
      // Keep other fields for version history
      debtAmount: toNumber(debtAmount),
      debtCurrencyId,
      debtByCurrency: getDebtByCurrency(),
      balanceCurrencyId: getSingleAccountBalanceCurrencyId(selectedAccount),
      accountBalanceBeforeByCurrency: balanceBeforeAtSave,
      accountBalanceChangeByCurrency: balanceChangeAtSave,
      accountBalanceAfterByCurrency: balanceAfterAtSave,
    };

    const savePromise = editId
      ? updateVoucher(Number(editId), payload)
      : addVoucher(payload);

    savePromise.then((res) => {
      if (res) {
        applyAccountBalanceDecrease();
        setSavedSnapshot(currentSnapshot);
        setIsLocked(true);
        showToast("پسوڵەی من قەرزارم خەزن کرا ✅", "success");
      } else {
        showToast("هەڵە لە خەزنکردن! تکایە دووبارە هەوڵ بدەوە.", "error");
      }
    }).catch((err) => {
      console.error("Save error:", err);
      showToast("هەڵەی نەتۆرک! تکایە دووبارە هەوڵ بدەوە.", "error");
    });
  }

  function handlePrint() {
    if (!isLocked && !isSaved) {
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

      <div style={pageGrid}>
        <aside style={leftPanel}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <label style={labelStyle}>هەژمار</label>

            <div style={accountInputWrap}>
              <input
                value={accountSearch}
                disabled={isLocked}
                onFocus={() => {
                  if (!isLocked) setShowAccountList(true);
                }}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setAccountSearch(e.target.value);
                  setAccountId(undefined);
                  setShowAccountList(true);
                  setShowAccountInfo(false);
                }}
                placeholder="هەژمار"
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
                  title="لابردنی هەژمار"
                >
                  ×
                </button>
              )}
            </div>

            {showAccountList && !isLocked && (
              <div style={dropdownLarge}>
                {filteredAccounts.length === 0 ? (
                  <div style={emptyText}>هیچ هەژمارێک نەدۆزرایەوە</div>
                ) : (
                  filteredAccounts.map((account: any) => (
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
                  ))
                )}
              </div>
            )}
          </div>

          {selectedAccount && (
            <div style={accountInfoToggleBox}>
              <button
                type="button"
                style={noteToggleBtn}
                onClick={() => setShowAccountInfo((prev) => !prev)}
              >
                {showAccountInfo
                  ? "▲ شاردنەوەی زانیاری هەژمار"
                  : "▼ زانیاری هەژمار"}
              </button>
            </div>
          )}

          {selectedAccount && showAccountInfo && (
            <div style={accountCard}>
              <div style={sectionTitle}>زانیاری هەژمار</div>

              <InfoRow label="ژمارەی تەلەفۆن">
                {selectedAccount.phone || "-"}
              </InfoRow>

              <InfoRow label="شار">{selectedAccount.city || "-"}</InfoRow>

              <InfoRow label="ناونیشان">
                {selectedAccount.address || "-"}
              </InfoRow>

              <InfoRow label="باڵانسی پێشوو">
                <span
                  style={{
                    color: formatBalanceColor(accountBalanceBeforeByCurrency),
                    fontWeight: 900,
                  }}
                >
                  {formatCurrencyMap(accountBalanceBeforeByCurrency)}
                </span>
              </InfoRow>

              <InfoRow label="کۆی گشتی ماوە">
                <span
                  style={{
                    color: formatBalanceColor(accountBalanceAfterByCurrency),
                    fontWeight: 900,
                  }}
                >
                  {formatCurrencyMap(accountBalanceAfterByCurrency)}
                </span>
              </InfoRow>
            </div>
          )}

          <div style={totalsCard}>
            <div style={totalGrid}>
              <StatBox
                title="بڕی قەرز"
                value={
                  toNumber(debtAmount) > 0
                    ? formatCurrencyAmount(toNumber(debtAmount), debtCurrencyId)
                    : "0"
                }
                color="#dc2626"
              />

              <StatBox
                title="کۆی گشتی ماوە"
                value={formatCurrencyMap(accountBalanceAfterByCurrency)}
                color={formatBalanceColor(accountBalanceAfterByCurrency)}
              />
            </div>

            <div style={twoCol}>
              <Field label="بڕی قەرز">
                <input
                  value={debtAmount}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setDebtAmount(onlyDecimal(e.target.value));
                  }}
                  inputMode="decimal"
                  lang="en"
                  dir="ltr"
                  placeholder="0"
                  style={{ ...input, ...lockedFieldStyle }}
                />
              </Field>

              <Field label="دراو">
                <select
                  value={debtCurrencyId}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (blockIfLocked()) return;
                    setDebtCurrencyId(Number(e.target.value));
                  }}
                  style={{ ...input, ...lockedFieldStyle , minWidth: "130px"  }}
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
                      onChange={(e) => {
                        if (blockIfLocked()) return;
                        setReceiptNote(e.target.value);
                      }}
                      rows={3}
                      style={{ ...textarea, ...lockedFieldStyle }}
                    />
                  </Field>

                  <Field label="تێبینی چاپ">
                    <textarea
                      value={printNote}
                      disabled={isLocked}
                      onChange={(e) => {
                        if (blockIfLocked()) return;
                        setPrintNote(e.target.value);
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
                opacity: (isLocked || (!!editId && isSaved)) ? 0.55 : 1,
                cursor: (isLocked || (!!editId && isSaved)) ? "not-allowed" : "pointer",
              }}
              onClick={handleSave}
              disabled={isLocked || (!!editId && isSaved)}
            >
              {isLocked ? "خەزن کراوە" : editId ? "نوێکردنەوە" : "خەزنکردن"}
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
            {headerSelector ? headerSelector : <h2 style={{ margin: 0 }}>من قەرزارم</h2>}
            
          </div>

          <div style={emptyMainCard}>
            <h2 style={{ marginTop: 0 }}>پسوڵەی هاوپێچکراو</h2>
            <button style={viewBtn}>بینین</button>
          </div>
        </main>
      </div>

      <div id="my-debt-print-area" style={printArea}>
        <div style={printPage}>
          <PrintWatermark />
          <PrintHeader />

          <div style={printInfoGrid}>
            {printOptions.showAccountInfo && (
              <div style={printInfoBox}>
                {printOptions.showAccountName && (
                  <PrintInfoLine
                    label="هەژمار"
                    value={selectedAccount?.name || "-"}
                  />
                )}

                {printOptions.showAccountPhone && (
                  <PrintInfoLine
                    label="ژمارەی تەلەفۆن"
                    value={selectedAccount?.phone || "-"}
                  />
                )}

                {printOptions.showAccountAddress && (
                  <PrintInfoLine
                    label="ناونیشان"
                    value={
                      [selectedAccount?.city, selectedAccount?.address]
                        .filter(Boolean)
                        .join(" - ") || "-"
                    }
                  />
                )}
              </div>
            )}

            {printOptions.showReceiptInfo && (
              <div style={printInfoBox}>
                <PrintInfoLine label="جۆری پسوڵە" value="من قەرزارم" />

                {printOptions.showReceiptNumber && (
                  <PrintInfoLine label="ژمارەی پسوڵە" value={receiptNumber} />
                )}

                {printOptions.showReceiptDate && (
                  <PrintInfoLine
                    label="بەروار"
                    value={formatDate(receiptDate)}
                  />
                )}

                {printOptions.showCreatedTime && (
                  <PrintInfoLine label="کاتژمێر" value={createdTime} />
                )}
              </div>
            )}
          </div>

          {printOptions.showEmployeeInfo &&
            (employeeNameFromLogin.trim() !== "" ||
              employeePhoneFromLogin.trim() !== "") && (
              <div style={printEmployeeBox}>
                {employeeNameFromLogin.trim() !== "" && (
                  <PrintInfoLine
                    label="کارمەند"
                    value={employeeNameFromLogin}
                  />
                )}

                {employeePhoneFromLogin.trim() !== "" && (
                  <PrintInfoLine
                    label="مۆبایل"
                    value={employeePhoneFromLogin}
                  />
                )}
              </div>
            )}

          <div style={printBottomGrid}>
            <div style={printSummaryBox}>
              <PrintSummaryLine
                label="باڵانسی پێشوو"
                value={formatCurrencyMap(accountBalanceBeforeByCurrency)}
                bold
              />

              <PrintSummaryLine
                label="بڕی قەرز"
                value={
                  toNumber(debtAmount) > 0
                    ? formatCurrencyAmount(toNumber(debtAmount), debtCurrencyId)
                    : "0"
                }
              />

              <PrintSummaryLine
                label="کۆی گشتی ماوە"
                value={formatCurrencyMap(accountBalanceAfterByCurrency)}
                bold
              />
            </div>

            <div style={printSummaryBox}>
              {printNote.trim() !== "" && (
                <div style={printExpenseNoteBox}>
                  <b>تێبینی:</b> {printNote}
                </div>
              )}
            </div>
          </div>
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
              <div style={settingsSection}>
                <h3 style={settingsTitle}>زانیاریەکانی بەشی سەرەوە</h3>

                <div style={settingGrid2}>
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
                    label="کاتژمێری دروستکردن"
                    checked={printOptions.showCreatedTime}
                    onChange={() => togglePrintOption("showCreatedTime")}
                  />

                  <SettingCheck
                    label="زانیاری هەژمار دەرکەوێت"
                    checked={printOptions.showAccountInfo}
                    onChange={() => togglePrintOption("showAccountInfo")}
                  />

                  <SettingCheck
                    label="ناوی هەژمار"
                    checked={printOptions.showAccountName}
                    onChange={() => togglePrintOption("showAccountName")}
                  />

                  <SettingCheck
                    label="ژمارەی هەژمار"
                    checked={printOptions.showAccountPhone}
                    onChange={() => togglePrintOption("showAccountPhone")}
                  />

                  <SettingCheck
                    label="ناونیشانی هەژمار"
                    checked={printOptions.showAccountAddress}
                    onChange={() => togglePrintOption("showAccountAddress")}
                  />
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
                    {employeeNameFromLogin.trim() || "لە ئەکاونتی کارمەنددا نییە"}
                  </div>
                  <div>
                    <b>مۆبایل:</b>{" "}
                    {employeePhoneFromLogin.trim() || "لە ئەکاونتی کارمەنددا نییە"}
                  </div>
                </div>
              </div>

              {hasIqdDebt && (
                <div style={settingsSection}>
                  <h3 style={settingsTitle}>نرخی گۆڕینەوە</h3>

                  <Field label="ڕەیتی 100 دۆلار بە دینار">
                    <FormattedNumberInput
                      value={exchangeRate}
                      disabled={isLocked}
                      onChange={(val) => {
                        if (blockIfLocked()) return;
                        setExchangeRate(val);
                      }}
                      style={{ ...input, ...lockedFieldStyle }}
                    />
                  </Field>
                </div>
              )}
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
    <label style={{ display: "block" }}>
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
    <div style={printSummaryLine}>
      <span style={{ fontWeight: bold ? 900 : 700 }}>{label}</span>
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

const appFont = `"Speda", "Segoe UI", Tahoma, Arial, sans-serif`;

const printCss = `
@media print {
  @page { size: auto; margin: 8mm; }

  body * { visibility: hidden !important; }

  #my-debt-print-area,
  #my-debt-print-area * {
    visibility: visible !important;
  }

  #my-debt-print-area {
    display: block !important;
    position: absolute !important;
    left: 0 !important; top: 0 !important;
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

const emptyText: CSSProperties = {
  padding: 14,
  textAlign: "center",
  color: "#64748b",
};

const smallMuted: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#6b7280",
  marginTop: 4,
};

const accountInfoToggleBox: CSSProperties = {
  marginBottom: 12,
};

const accountCard: CSSProperties = {
  background: "#fafafa",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  marginBottom: 14,
};

const sectionTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 12,
};

const infoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "130px 1fr",
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

const totalGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
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

const emptyMainCard: CSSProperties = {
  minHeight: 160,
  background: "#f3f4f6",
  borderRadius: 14,
  padding: 30,
  textAlign: "right",
};

const viewBtn: CSSProperties = {
  border: 0,
  background: "#dbeafe",
  color: "#2563eb",
  borderRadius: 8,
  padding: "10px 18px",
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
  border: "1px solid #e5e7eb",
  padding: 8,
  fontSize: 11,
  minHeight: 54,
};

const printEmployeeBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: 8,
  fontSize: 11,
  marginBottom: 8,
  background: "#fafafa",
};

const printInfoRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
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
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  borderBottom: "1px solid #f1f5f9",
  padding: "4px 0",
};

const printExpenseNoteBox: CSSProperties = {
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

const modalFooter: CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-start",
};