"use client";
import DateInput from "./DateInput";
import FormattedNumberInput from "./FormattedNumberInput";
import PrintHeader, { PrintWatermark } from "./PrintHeader";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { store, useStore } from "../store/store";
import { calculateLedgerEntries } from "../utils/ledgerHelper";
import { currencies as mockCurrencies } from "../data/mockData";

type ToastType = "error" | "success" | "info";
type PaidAmounts = Record<number, string>;

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
  showAccountBalance: boolean;
};

type Props = {
  headerSelector?: ReactNode;
  editId?: string;
};

export default function MoneyInPage({ headerSelector, editId }: Props) {
  const [isEditLoading, setIsEditLoading] = useState(!!editId);

  useEffect(() => {
    setIsEditLoading(!!editId);
    if (editId) {
      setSavedSnapshot("");
    }
  }, [editId]);

  const storeCurrencies = useStore((s: any) => s.currencies) || [];
  const fetchCurrencies = useStore((s: any) => s.fetchCurrencies);
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;
  const accounts = useStore((state) => state.accounts) || [];
  const cashboxes = useStore((state) => state.cashboxes) || [];
  const addVoucher = useStore((state) => state.addVoucher);
  const updateVoucher = useStore((state) => state.updateVoucher);

  const fetchAccounts = useStore((state) => state.fetchAccounts);
  const fetchCashboxes = useStore((state) => state.fetchCashboxes);

  const defaultCurrency =
    currencies[0] ||
    ({ id: 1, name: "دۆلار", code: "USD", symbol: "$" } as any);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("error");

  const [receiptNumber, setReceiptNumber] = useState("");
  const [createdTime, setCreatedTime] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [isLoading, setIsLoading] = useState(editId ? true : false);

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

    if (currencies.length === 0) fetchCurrencies();
    if (accounts.length === 0) fetchAccounts();
    if (cashboxes.length === 0) fetchCashboxes();
  }, [editId]);

  useEffect(() => {
    if (editId) {
      setIsLoading(true);
      fetch(`/api/vouchers/${editId}`)
        .then((res) => res.json())
        .then((voucher) => {
          if (voucher) {
            setOriginalVoucher(voucher);
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
            }
            if (voucher.cashboxId) setCashboxId(voucher.cashboxId);

            const initialPaid: PaidAmounts = {};
            if (voucher.paidAmounts && Array.isArray(voucher.paidAmounts)) {
              voucher.paidAmounts.forEach((pa: any) => {
                initialPaid[pa.currencyId] = String(pa.amount);
              });
            }
            setPaidAmounts(initialPaid);

            setReceiptNote(voucher.internalNote || "");
            setPrintNote(voucher.printNote || "");
            if (voucher.internalNote || voucher.printNote) setShowNotes(true);

            if (voucher.exchangeRate) {
              setExchangeRate(String(voucher.exchangeRate * 100));
            }
            if (voucher.currencyId) {
              setTargetCurrencyId(voucher.currencyId);
            }

            setIsLocked(false);
          }
        })
        .catch((err) => console.error("Error loading voucher:", err))
        .finally(() => setIsEditLoading(false))
        .finally(() => setIsLoading(false));
    }
  }, [editId]);

  const [accountSearch, setAccountSearch] = useState("");
  const [accountId, setAccountId] = useState<number | undefined>();
  const [showAccountList, setShowAccountList] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  const [cashboxId, setCashboxId] = useState<number | undefined>(
    cashboxes[0]?.id
  );

  const [paidCurrencyId, setPaidCurrencyId] = useState<number>(
    defaultCurrency.id
  );
  const [paidAmounts, setPaidAmounts] = useState<PaidAmounts>({});
  const [exchangeRate, setExchangeRate] = useState("150000");

  const [receiptNote, setReceiptNote] = useState("");
  const [printNote, setPrintNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showNewReceiptConfirm, setShowNewReceiptConfirm] = useState(false);

  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (accountId && accounts.length > 0) {
      const acc = accounts.find((a: any) => a.id === accountId);
      if (acc) setAccountSearch(acc.name);
    }
  }, [accountId, accounts]);

  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    showReceiptInfo: true,
    showReceiptNumber: true,
    showReceiptDate: true,
    showCreatedTime: true,
    showCashbox: true,
    showAccountInfo: true,
    showAccountName: true,
    showAccountPhone: true,
    showAccountAddress: true,
    showAccountBalance: true,
  });

  const [targetCurrencyId, setTargetCurrencyId] = useState<number | undefined>();
  const [excessModalConfig, setExcessModalConfig] = useState<{
    isOpen: boolean;
    excessAmount: number;
    targetCurrencyId: number;
    otherCurrencyId: number;
  } | null>(null);

  const selectedAccount = accounts.find((a: any) => a.id === accountId);
  const selectedCashbox = cashboxes.find((c: any) => c.id === cashboxId);

  const [originalVoucher, setOriginalVoucher] = useState<any>(null);

  const accountBalanceBeforeByCurrency = useMemo(() => {
    const currentBalMap = getAccountBalanceBeforeMap(selectedAccount);
    if (!editId) {
      return currentBalMap;
    }

    if (!originalVoucher || !selectedAccount) {
      return currentBalMap;
    }

    // If the account in the form is not the original voucher's account,
    // the selected account's current balance hasn't been affected by this voucher.
    if (Number(accountId) !== originalVoucher.accountId) {
      return currentBalMap;
    }

    if (originalVoucher.historicalBalanceBefore) {
      return originalVoucher.historicalBalanceBefore;
    }

    // Reverse the contribution of this voucher to get the balance BEFORE this voucher
    const computedBefore = { ...currentBalMap };
    if (originalVoucher.ledgerEntries) {
      originalVoucher.ledgerEntries.forEach((le: any) => {
        if (le.accountId === Number(accountId)) {
          const curIdText = String(le.currencyId);
          const change = le.debit - le.credit;
          computedBefore[curIdText] = (computedBefore[curIdText] || 0) - change;
        }
      });
    }

    return computedBefore;
  }, [selectedAccount, editId, originalVoucher, accountId]);

  const activeBalances = useMemo(() => {
    return Object.entries(accountBalanceBeforeByCurrency)
      .filter(([, amount]) => Math.abs(Number(amount)) > 0.01);
  }, [accountBalanceBeforeByCurrency]);

  const isMultiCurrencyAccount = activeBalances.length > 1;

  useEffect(() => {
    if (selectedAccount) {
      if (activeBalances.length > 1) {
        const hasPaidCur = activeBalances.some(([id]) => Number(id) === paidCurrencyId);
        setTargetCurrencyId(hasPaidCur ? paidCurrencyId : Number(activeBalances[0][0]));
      } else {
        setTargetCurrencyId(undefined);
      }
    } else {
      setTargetCurrencyId(undefined);
    }
  }, [accountId, paidCurrencyId, activeBalances, selectedAccount]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();

    const activeAccounts = accounts.filter((account: any) => account.isActive !== false);

    if (!q) return activeAccounts;

    return activeAccounts.filter((account: any) => {
      return (
        String(account.name || "").toLowerCase().includes(q) ||
        String(account.phone || "").toLowerCase().includes(q) ||
        String(account.city || "").toLowerCase().includes(q)
      );
    });
  }, [accountSearch, accounts]);

  const paidCurrencies = getPaidCurrencies();
  const hasMixedPaidCurrency =
    new Set(paidCurrencies.map((x: any) => x.currencyId)).size > 1;

  const activeTargetCurrencyId = targetCurrencyId || getSingleAccountBalanceCurrencyId(selectedAccount);
  const showRate = hasMixedPaidCurrency || paidCurrencyId !== activeTargetCurrencyId;

  const accountBalanceAfterByCurrency = useMemo(() => {
    if (!selectedAccount) return {};
    const before = accountBalanceBeforeByCurrency;
    const activeTargetCurrencyId = targetCurrencyId || getSingleAccountBalanceCurrencyId(selectedAccount);
    const rate = toNumber(exchangeRate) / 100;

    const result = calculateLedgerEntries({
      type: "money_in",
      netAmount: 0,
      currencyId: activeTargetCurrencyId,
      exchangeRate: rate,
      paidAmounts: getPaidCurrencies().map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === activeTargetCurrencyId) ? 1 : rate
      })),
      extraPaymentHandling: null,
      balanceBeforeByCurrency: before
    });

    return result.balanceAfterByCurrency;
  }, [selectedAccount, paidAmounts, targetCurrencyId, exchangeRate, isMultiCurrencyAccount, accountBalanceBeforeByCurrency]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      accountId,
      receiptDate,
      createdTime,
      cashboxId,
      paidAmounts,
      paidCurrencyId,
      exchangeRate,
      receiptNote,
      printNote,
    });
  }, [
    accountId,
    receiptDate,
    createdTime,
    cashboxId,
    paidAmounts,
    paidCurrencyId,
    exchangeRate,
    receiptNote,
    printNote,
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
      showToast("ئەم پسوڵەیە خەزن کراوە و ئیتر ناتوانرێت گۆڕانکاری لەسەر بکرێت.");
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

  function getCurrencyKey(currencyId: number) {
    return String(currencyId);
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

  function formatCurrencyMapWithColors(map: Record<string, number>) {
    const activeEntries = Object.entries(map).filter(([_, val]) => Math.abs(val) > 0.01);
    if (activeEntries.length === 0) {
      return <span style={{ color: "#9ca3af", fontWeight: 900 }}>0</span>;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        {activeEntries.map(([curIdText, val]) => {
          const isNegative = val < -0.01;
          const color = isNegative ? "#dc2626" : "#16a34a";
          const symbol = getCurrencySymbol(Number(curIdText));
          const formatted = Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
          return (
            <span key={curIdText} style={{ color, fontWeight: 900, fontSize: 14 }} dir="ltr">
              {isNegative ? "-" : ""}{symbol}{formatted}
            </span>
          );
        })}
      </div>
    );
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

  function getSingleAccountBalanceCurrencyId(account?: AccountLike): number {
    if (!account?.balanceByCurrency) {
      return account?.balanceCurrencyId || account?.creditLimitCurrencyId || defaultCurrency.id || 1;
    }

    const activeCurrencies = Object.entries(account.balanceByCurrency)
      .filter(([, amount]) => Math.abs(Number(amount || 0)) > 0.0001)
      .map(([currencyIdText]) => Number(currencyIdText));

    if (activeCurrencies.length === 1) return activeCurrencies[0];

    return account.balanceCurrencyId || account.creditLimitCurrencyId || defaultCurrency.id || 1;
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
        account.balanceCurrencyId || account.creditLimitCurrencyId || defaultCurrency.id;
      map[String(balanceCurrencyId)] = Number(account.balance || 0);
    }

    return map;
  }

  function subtractMoneyMap(
    baseMap: Record<string, number>,
    subtractMap: Record<string, number>
  ) {
    const result: Record<string, number> = { ...baseMap };

    for (const [currencyIdText, amount] of Object.entries(subtractMap)) {
      result[currencyIdText] =
        Number(result[currencyIdText] || 0) - Number(amount || 0);
    }

    return result;
  }

  function getPaidCurrencies() {
    return Object.entries(paidAmounts)
      .map(([currencyIdText, amountText]) => ({
        currencyId: Number(currencyIdText),
        amount: toNumber(amountText),
      }))
      .filter((x: any) => x.amount > 0);
  }

  function getPaidAmountsByCurrency() {
    const map: Record<string, number> = {};

    for (const item of getPaidCurrencies()) {
      const key = getCurrencyKey(item.currencyId);
      map[key] = (map[key] || 0) + item.amount;
    }

    return map;
  }

  function getPaidSummaryText() {
    const list = getPaidCurrencies();
    if (list.length === 0) return "0";

    return list
      .map((item: any) => formatCurrencyAmount(item.amount, item.currencyId))
      .join(" + ");
  }

  function getAccountBalanceReductionByCurrency(activeTargetCurrencyId?: number) {
    const balanceCurrencyId = activeTargetCurrencyId || getSingleAccountBalanceCurrencyId(selectedAccount);
    return normalizeMoneyMapToSingleCurrency(
      getPaidAmountsByCurrency(),
      balanceCurrencyId
    );
  }

  function getTotalPaidInDefaultCurrency() {
    return getPaidCurrencies().reduce((sum, item) => {
      return sum + convertCurrency(item.amount, item.currencyId, defaultCurrency.id);
    }, 0);
  }

  function updatePaidAmount(currencyId: number, value: string) {
    if (blockIfLocked()) return;

    setPaidAmounts((prev) => ({
      ...prev,
      [currencyId]: onlyDecimal(value),
    }));
  }

  function validateBeforeSave() {
    if (!accountId) {
      showToast("پسوڵەی پارەی هاتوو نابێت بێ هەژمار خەزن بکرێت.");
      return false;
    }

    if (getPaidCurrencies().length === 0) {
      showToast("تکایە بڕی پارەی دراو داغڵ بکە.");
      return false;
    }

    return true;
  }

  function applyCashboxIncrease() {
    const cashbox = cashboxes.find((c: any) => c.id === cashboxId);
    if (!cashbox) return;

    if (!cashbox.balances) cashbox.balances = [];

    for (const paid of getPaidCurrencies()) {
      const existing = cashbox.balances.find(
        (b: any) => b.currencyId === paid.currencyId
      );

      if (existing) {
        existing.amount = Number(existing.amount || 0) + paid.amount;
      } else {
        cashbox.balances.push({ currencyId: paid.currencyId, amount: paid.amount });
      }
    }

    if (!cashbox.balanceByCurrency) cashbox.balanceByCurrency = {};

    for (const paid of getPaidCurrencies()) {
      const key = getCurrencyKey(paid.currencyId);
      cashbox.balanceByCurrency[key] =
        Number(cashbox.balanceByCurrency[key] || 0) + paid.amount;
    }

    if (typeof cashbox.balance === "number") {
      cashbox.balance = Number(cashbox.balance || 0) + getTotalPaidInDefaultCurrency();
    }
  }

  function applyAccountBalanceReduction(action: "keep_credit" | "cross_deduct" | null) {
    if (!accountId) return;

    const account = accounts.find((a: any) => a.id === accountId);
    if (!account) return;

    const before = accountBalanceBeforeByCurrency;
    const activeTargetCurrencyId = targetCurrencyId || getSingleAccountBalanceCurrencyId(account);
    const rate = toNumber(exchangeRate) / 100;

    const extraHandling = action === "cross_deduct"
      ? "convert_to_other_currency"
      : (action === "keep_credit" ? "keep_as_same_currency_balance" : null);

    const result = calculateLedgerEntries({
      type: "money_in",
      netAmount: 0,
      currencyId: activeTargetCurrencyId,
      exchangeRate: rate,
      paidAmounts: getPaidCurrencies().map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === activeTargetCurrencyId) ? 1 : rate
      })),
      extraPaymentHandling: extraHandling,
      balanceBeforeByCurrency: before
    });

    if (account.balanceByCurrency) {
      account.balanceByCurrency = { ...result.balanceAfterByCurrency };
    }

    if (typeof account.balance === "number") {
      account.balance = Object.entries(result.balanceAfterByCurrency).reduce((sum, [curId, amount]) => {
        return sum + convertCurrency(amount, Number(curId), defaultCurrency.id);
      }, 0);
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
    setPaidAmounts({});
    setPaidCurrencyId(defaultCurrency.id);
    setExchangeRate("150000");
    setReceiptNote("");
    setPrintNote("");
    setShowNotes(false);
    setSavedSnapshot("");
    setIsLocked(false);
    setTargetCurrencyId(undefined);
  }

  function hasUnsavedData() {
    const hasPaid = Object.values(paidAmounts).some((x: any) => x.trim() !== "");

    return (
      accountId !== undefined ||
      accountSearch.trim() !== "" ||
      hasPaid ||
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

  function saveVoucher(action: "keep_credit" | "cross_deduct" | null) {
    if (isLocked) {
      showToast("ئەم پسوڵەیە پێشتر خەزن کراوە.");
      return;
    }

    setExcessModalConfig(null);

    const activeTargetCurrencyId = targetCurrencyId || getSingleAccountBalanceCurrencyId(selectedAccount);
    const before = accountBalanceBeforeByCurrency;
    const rate = toNumber(exchangeRate) / 100;

    const extraHandling = action === "cross_deduct"
      ? "convert_to_other_currency"
      : (action === "keep_credit" ? "keep_as_same_currency_balance" : null);

    const result = calculateLedgerEntries({
      type: "money_in",
      netAmount: 0,
      currencyId: activeTargetCurrencyId,
      exchangeRate: rate,
      paidAmounts: getPaidCurrencies().map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === activeTargetCurrencyId) ? 1 : rate
      })),
      extraPaymentHandling: extraHandling,
      balanceBeforeByCurrency: before
    });

    const totalPaidInTargetCurrency = getPaidCurrencies().reduce((sum, item) => {
      return sum + convertCurrency(item.amount, item.currencyId, activeTargetCurrencyId);
    }, 0);

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
      type: "money_in",
      referenceNo: receiptNumber,
      date: combineDateAndTime(receiptDate, createdTime),
      accountId: accountId ? Number(accountId) : null,
      cashboxId: cashboxId ? Number(cashboxId) : null,
      currencyId: activeTargetCurrencyId,
      exchangeRate: rate,
      totalAmount: totalPaidInTargetCurrency,
      netAmount: 0,
      internalNote: receiptNote,
      printNote,
      paidAmounts: getPaidCurrencies().map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === activeTargetCurrencyId) ? 1 : rate
      })),
      ledgerEntries: result.ledgerEntries,
      extraPaymentHandling: extraHandling
    };

    setIsSaving(true);
    const savePromise = editId
      ? updateVoucher(Number(editId), payload)
      : addVoucher(payload);

    savePromise
      .then((res) => {
        if (res) {
          if (!editId) {
            applyAccountBalanceReduction(action);
            applyCashboxIncrease();
            setIsLocked(true);
          }
          setSavedSnapshot(currentSnapshot);
          showToast(
            editId
               ? "پسوڵەکە بە سەرکەوتوویی نوێکرایەوە ✅"
               : "پسوڵەی پارەی هاتوو خەزن کرا ✅ قاسە زیادکرا و قەرزی هەژمار کەمکرایەوە.",
            "success"
          );
        } else {
          showToast("تکایە دووبارە هەوڵ بدەرەوە ❌");
        }
      })
      .catch((err) => {
        console.error("Save error:", err);
        showToast("پەیوەندی لەکارکەوت، تکایە دووبارە هەوڵ بدەرەوە ❌");
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  function handleSave() {
    if (isLocked) {
      showToast("ئەم پسوڵەیە پێشتر خەزن کراوە.");
      return;
    }

    if (!validateBeforeSave()) return;

    const activeTargetCurrencyId = targetCurrencyId || getSingleAccountBalanceCurrencyId(selectedAccount);
    const before = accountBalanceBeforeByCurrency;
    const rate = toNumber(exchangeRate) / 100;

    const result = calculateLedgerEntries({
      type: "money_in",
      netAmount: 0,
      currencyId: activeTargetCurrencyId,
      exchangeRate: rate,
      paidAmounts: getPaidCurrencies().map((p: any) => ({
        currencyId: p.currencyId,
        amount: p.amount,
        exchangeRate: (p.currencyId === activeTargetCurrencyId) ? 1 : rate
      })),
      extraPaymentHandling: null,
      balanceBeforeByCurrency: before
    });

    if (result.excess.exists) {
      setExcessModalConfig({
        isOpen: true,
        excessAmount: result.excess.amount,
        targetCurrencyId: result.excess.targetCurrencyId,
        otherCurrencyId: result.excess.otherCurrencyId
      });
    } else {
      saveVoucher(null);
    }
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

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8 min-h-[300px]">
        <div className="text-xl font-bold text-slate-500 animate-pulse flex items-center gap-2 rtl">
          چاوەڕێ بکە... پسوڵەکە بار دەکرێت 🔄
        </div>
      </div>
    );
  }

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

          {selectedAccount && isMultiCurrencyAccount && !isLocked && (
            <div style={{
              background: "rgba(243, 244, 246, 0.6)",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
            }}>
              <div style={{ ...labelStyle, fontSize: 13, marginBottom: 8 }}>کەمکردنەوە لە باڵانسی دراوی:</div>
              <div style={{ display: "flex", gap: 8 }}>
                {activeBalances.map(([currencyIdText]) => {
                  const curId = Number(currencyIdText);
                  const symbol = getCurrencySymbol(curId);
                  const code = getCurrencyCode(curId);
                  const isSelected = targetCurrencyId === curId;
                  
                  return (
                    <button
                      key={curId}
                      type="button"
                      onClick={() => setTargetCurrencyId(curId)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: isSelected ? "2px solid #2563eb" : "1px solid #d1d5db",
                        background: isSelected ? "#eff6ff" : "white",
                        color: isSelected ? "#1d4ed8" : "#374151",
                        fontWeight: isSelected ? 900 : 700,
                        cursor: "pointer",
                        fontSize: 13,
                        fontFamily: appFont,
                        textAlign: "center"
                      }}
                    >
                      {symbol} ({code})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedAccount && (
            <div style={accountInfoToggleBox}>
              <button
                type="button"
                style={noteToggleBtn}
                onClick={() => setShowAccountInfo((prev) => !prev)}
              >
                {showAccountInfo ? "▲ شاردنەوەی زانیاری هەژمار" : "▼ زانیاری هەژمار"}
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
              <InfoRow label="قەرزی پێشوو">
                {formatCurrencyMapWithColors(accountBalanceBeforeByCurrency)}
              </InfoRow>
              <InfoRow label="کۆی گشتی ماوە">
                {formatCurrencyMapWithColors(accountBalanceAfterByCurrency)}
              </InfoRow>
            </div>
          )}

          <div style={totalsCard}>
            <div style={totalGrid}>
              <StatBox title="پارەی دراو" value={getPaidSummaryText()} color="#16a34a" />
              <StatBox
                title="کۆی گشتی ماوە"
                value={formatCurrencyMapWithColors(accountBalanceAfterByCurrency)}
              />
            </div>

            <Field label="قاسە">
              <select
                value={cashboxId || ""}
                disabled={isLocked}
                onChange={(e) => {
                  if (blockIfLocked()) return;
                  setCashboxId(Number(e.target.value));
                }}
                style={{ ...input, ...lockedFieldStyle }}
              >
                {cashboxes.map((cashbox: any) => (
                  <option key={cashbox.id} value={cashbox.id}>
                    {cashbox.name}
                  </option>
                ))}
              </select>
            </Field>

            
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              {currencies.filter((c: any) => c.id === paidCurrencyId || (paidAmounts[c.id] && paidAmounts[c.id].trim() !== "" && parseFloat(paidAmounts[c.id]) !== 0)).map((currency: any) => {
                const isCurrent = currency.id === paidCurrencyId;
                const isConverted = showRate && currency.id !== activeTargetCurrencyId;

                const amountInput = (
                  <Field label={isCurrent ? "پارەی دراو" : `پارەی دراو (${currency.name})`}>
                    <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden", width: "100%" }}>
                      <select
                        value={currency.id}
                        disabled={isLocked}
                        onChange={(e) => setPaidCurrencyId(Number(e.target.value))}
                        style={{ border: "none", borderLeft: "1px solid #d1d5db", background: "#f8fafc", padding: "0 12px", outline: "none", fontWeight: "bold", color: "#1e293b", cursor: isLocked ? "not-allowed" : "pointer", minWidth: "90px" }}
                      >
                        {currencies.map((curr: any) => (
                          <option key={curr.id} value={curr.id}>
                            {curr.name}
                          </option>
                        ))}
                      </select>

                      <FormattedNumberInput
                        value={paidAmounts[currency.id] || ""}
                        disabled={isLocked}
                        onChange={(val) => updatePaidAmount(currency.id, val)}
                        placeholder="0"
                        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", padding: "8px 12px", background: isLocked ? "#f3f4f6" : "#fff", cursor: isLocked ? "not-allowed" : "text", textAlign: "right" }}
                      />

                      <span style={{ border: "none", borderRight: "1px solid #d1d5db", background: "#f8fafc", padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#475569", fontSize: "13px" }}>
                        {currency.symbol || getCurrencySymbol(currency.id)}
                      </span>
                    </div>
                  </Field>
                );

                const rateInput = isConverted ? (
                  <Field label="ڕەیتی 100 دۆلار">
                    <div style={{ display: "flex", border: "1px solid #93c5fd", borderRadius: 8, overflow: "hidden", background: "#f0f9ff" }}>
                      <FormattedNumberInput
                        value={exchangeRate}
                        disabled={isLocked}
                        onChange={(val) => {
                          if (blockIfLocked()) return;
                          setExchangeRate(val);
                        }}
                        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", padding: "8px 10px", background: "transparent", cursor: isLocked ? "not-allowed" : "text", color: "#1e40af", fontWeight: "bold" }}
                      />
                      <span style={{ border: "none", borderRight: "1px solid #bfdbfe", background: "#e0f2fe", padding: "0 8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#0369a1", fontSize: "12px", minWidth: "45px" }}>
                        دینار
                      </span>
                    </div>
                  </Field>
                ) : null;

                return (
                  <div key={currency.id} style={{ display: "flex", gap: 8, width: "100%", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      {amountInput}
                    </div>
                    {rateInput && (
                      <div style={{ width: 145, flexShrink: 0 }}>
                        {rateInput}
                      </div>
                    )}
                  </div>
                );
              })}
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
            {headerSelector ? headerSelector : <h2 style={{ margin: 0 }}>پارەی هاتوو</h2>}
          </div>

          <div style={emptyMainCard}>
            <h2 style={{ marginTop: 0 }}>پسوڵەی هاوپێچکراو</h2>
            <button style={viewBtn}>بینین</button>
          </div>
        </main>
      </div>

      <div id="money-in-print-area" style={printArea}>
        <div style={printPage}>
          <PrintWatermark />
          <PrintHeader />

          <div style={printInfoGrid}>
            {printOptions.showAccountInfo && (
              <div style={{ ...printInfoBox, width: "fit-content", marginLeft: "auto", minWidth: "220px" }}>
                {printOptions.showAccountName && (
                  <PrintInfoLine label="هەژمار" value={selectedAccount?.name || "-"} />
                )}
                {printOptions.showAccountPhone && (
                  <PrintInfoLine label="ژمارەی تەلەفۆن" value={selectedAccount?.phone || "-"} />
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
              <div style={{ ...printInfoBox, width: "fit-content", marginRight: "auto", minWidth: "220px" }}>
                <PrintInfoLine label="جۆری پسوڵە" value="پارەی هاتوو" />
                {printOptions.showReceiptNumber && (
                  <PrintInfoLine label="ژمارەی پسوڵە" value={receiptNumber} />
                )}
                {printOptions.showReceiptDate && (
                  <PrintInfoLine label="بەروار" value={formatDate(receiptDate)} />
                )}
                {printOptions.showCreatedTime && (
                  <PrintInfoLine label="کاتژمێر" value={createdTime} />
                )}
                {printOptions.showCashbox && (
                  <PrintInfoLine label="قاسە" value={selectedCashbox?.name || "-"} />
                )}
              </div>
            )}
          </div>

          <div style={printMoneyBox}>
            <PrintSummaryLine label="پارەی دراو" value={getPaidSummaryText()} bold />
          </div>

          <div style={printBottomGrid}>
            <div style={printSummaryBox}>
              <PrintSummaryLine
                label="قەرزی پێشوو"
                value={formatCurrencyMap(accountBalanceBeforeByCurrency)}
                bold
              />
              <PrintSummaryLine label="پارەی دراو" value={getPaidSummaryText()} />
              <PrintSummaryLine
                label="کۆی گشتی ماوە"
                value={formatCurrencyMap(accountBalanceAfterByCurrency)}
                bold
              />
            </div>

            <div style={printSummaryBox}>
              {showRate && (
                <PrintSummaryLine
                  label="ڕەیتی 100 دۆلار"
                  value={`${Number(exchangeRate || 0).toLocaleString("en-US")} دینار`}
                />
              )}
              
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
              <button style={outlineBlueBtn} onClick={() => setShowNewReceiptConfirm(false)}>
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

      {excessModalConfig?.isOpen && (
        <div style={modalOverlay}>
          <div style={{ ...confirmBox, width: 500 }}>
            <h2 style={{ marginTop: 0, color: "#dc2626", fontWeight: 900 }}>پارەی زیادە داغڵکراوە</h2>
            <p style={{ ...confirmText, color: "#374151", fontSize: 15, fontWeight: 700, lineHeight: 1.8 }}>
              بڕی پارەی دراو لە باڵانسی دراوی هەڵبژێردراو زیاترە بە بڕی:
              <br />
              <span style={{ color: "#2563eb", fontWeight: 900, fontSize: 18 }}>
                {formatCurrencyAmount(excessModalConfig.excessAmount, excessModalConfig.targetCurrencyId)}
              </span>
              <br />
              چۆن دەتەوێت مامەڵە لەگەڵ پارە زیادەکەدا بکەیت؟
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <button
                style={{
                  ...primaryBtn,
                  background: "#2563eb",
                  color: "white",
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 900,
                  borderRadius: 12,
                  border: 0,
                  cursor: "pointer"
                }}
                onClick={() => saveVoucher("keep_credit")}
              >
                وەک باڵانس (قەرزاربوون) لەم دراوەدا بمێنێتەوە
              </button>
              <button
                style={{
                  ...primaryBtn,
                  background: "#16a34a",
                  color: "white",
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 900,
                  borderRadius: 12,
                  border: 0,
                  cursor: "pointer"
                }}
                onClick={() => saveVoucher("cross_deduct")}
              >
                لە قەرزی دراوەکەی تر دەرکرێت ({formatCurrencyAmount(convertCurrency(excessModalConfig.excessAmount, excessModalConfig.targetCurrencyId, excessModalConfig.otherCurrencyId), excessModalConfig.otherCurrencyId)})
              </button>
              <button
                style={{
                  ...outlineBlueBtn,
                  background: "white",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  padding: "10px",
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 12,
                  cursor: "pointer"
                }}
                onClick={() => setExcessModalConfig(null)}
              >
                پاشگەزبوونەوە
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
              <button style={modalCloseBtn} onClick={() => setShowSettings(false)}>
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
                    label="قاسە"
                    checked={printOptions.showCashbox}
                    onChange={() => togglePrintOption("showCashbox")}
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
                  <SettingCheck
                    label="باڵانسی هەژمار"
                    checked={printOptions.showAccountBalance}
                    onChange={() => togglePrintOption("showAccountBalance")}
                  />
                </div>
              </div>

              {showRate && (
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

function StatBox({ title, value, color }: { title: string; value: ReactNode; color?: string }) {
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
    <div style={{ ...printInfoRow, justifyContent: "flex-start", gap: "6px" }}>
      <b style={{ marginLeft: "4px" }}>{label}:</b>
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

function SettingCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
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
  @page { size: auto; margin: 0mm 8mm 8mm 8mm; }
  body * { visibility: hidden !important; }
  #money-in-print-area, #money-in-print-area * { visibility: visible !important; }
  #money-in-print-area {
    display: block !important;
    position: relative !important;
    width: 100% !important;
    min-height: auto !important;
    background: white !important;
    z-index: 999999 !important;
  }
  button, input, select, textarea { display: none !important; }
}
`;

const page: CSSProperties = { direction: "rtl", fontFamily: appFont };
const toastBar: CSSProperties = { position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 99999, minWidth: 360, maxWidth: "80vw", padding: "12px 18px", borderRadius: 8, color: "white", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 10px 30px rgba(15,23,42,0.25)", textAlign: "center" };
const toastError: CSSProperties = { background: "#ef4444" };
const toastSuccess: CSSProperties = { background: "#16a34a" };
const toastInfo: CSSProperties = { background: "#2563eb" };
const toastCloseBtn: CSSProperties = { border: 0, background: "transparent", color: "white", fontSize: 26, lineHeight: 1, cursor: "pointer", fontWeight: 900 };
const pageGrid: CSSProperties = { display: "grid", gridTemplateColumns: "var(--page-grid-cols-no-items, 1000px 1fr)", gap: 18, alignItems: "stretch" };
const leftPanel: CSSProperties = { background: "white", border: "1px solid #e5e7eb", borderRadius: 18, padding: 16 };
const mainContent: CSSProperties = { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 };
const input: CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #d1d5db", fontSize: 15, outline: "none", background: "white", boxSizing: "border-box", fontFamily: appFont };
const textarea: CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #d1d5db", fontSize: 15, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: appFont };
const labelStyle: CSSProperties = { marginBottom: 6, fontWeight: 700, color: "#374151" };
const accountInputWrap: CSSProperties = { position: "relative", width: "100%" };
const accountClearBtn: CSSProperties = { position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", border: "1px solid #fecaca", background: "#fee2e2", color: "#dc2626", fontSize: 20, fontWeight: 900, lineHeight: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: appFont, zIndex: 5 };
const dropdownLarge: CSSProperties = { position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, background: "white", border: "1px solid #d1d5db", borderRadius: 12, boxShadow: "0 14px 35px rgba(15,23,42,0.12)", zIndex: 80, maxHeight: "70vh", overflowY: "auto" };
const dropdownItem: CSSProperties = { display: "block", width: "100%", textAlign: "right", border: 0, background: "white", padding: 12, cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontFamily: appFont };
const emptyText: CSSProperties = { padding: 14, textAlign: "center", color: "#64748b" };
const smallMuted: CSSProperties = { display: "block", fontSize: 12, color: "#6b7280", marginTop: 4 };
const accountInfoToggleBox: CSSProperties = { marginBottom: 12 };
const accountCard: CSSProperties = { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, marginBottom: 14 };
const sectionTitle: CSSProperties = { fontSize: 18, fontWeight: 900, marginBottom: 12 };
const infoRow: CSSProperties = { display: "grid", gridTemplateColumns: "130px 1fr", gap: 8, padding: "7px 0", borderBottom: "1px solid #e5e7eb" };
const infoKey: CSSProperties = { fontWeight: 700, color: "#374151" };
const infoVal: CSSProperties = { color: "#111827" };
const totalsCard: CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 12 };
const totalGrid: CSSProperties = { display: "grid", gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)", gap: 10 };
const statBox: CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fbfbfb" };
const twoCol: CSSProperties = { display: "grid", gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)", gap: 12 };
const noteToggleBox: CSSProperties = { borderTop: "1px solid #e5e7eb", paddingTop: 10 };
const noteToggleBtn: CSSProperties = { width: "100%", border: "1px solid #d1d5db", background: "#f8fafc", color: "#374151", borderRadius: 12, padding: "12px", fontWeight: 800, cursor: "pointer", textAlign: "center", fontFamily: appFont };
const notesInsidePayment: CSSProperties = { display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 12 };
const sideActions: CSSProperties = { display: "grid", gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)", gap: 10, marginTop: 14 };
const outlineBlueBtn: CSSProperties = { borderRadius: 12, border: "1px solid #2563eb", background: "white", color: "#2563eb", padding: "12px", fontWeight: 800, cursor: "pointer", fontFamily: appFont };
const primaryBtn: CSSProperties = { borderRadius: 12, border: 0, background: "#2563eb", color: "white", padding: "12px", fontWeight: 800, cursor: "pointer", fontFamily: appFont };
const printBtn: CSSProperties = { borderRadius: 12, border: 0, background: "#22c55e", color: "white", padding: "12px", fontWeight: 800, cursor: "pointer", fontFamily: appFont };
const dangerBtn: CSSProperties = { borderRadius: 12, border: 0, background: "#dc2626", color: "white", padding: "12px", fontWeight: 900, cursor: "pointer", fontFamily: appFont };
const unsavedNotice: CSSProperties = { marginTop: 12, padding: 12, borderRadius: 12, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", fontWeight: 800, textAlign: "center" };
const lockedNotice: CSSProperties = { marginTop: 12, padding: 12, borderRadius: 12, background: "#e0f2fe", color: "#075985", border: "1px solid #bae6fd", fontWeight: 900, textAlign: "center" };
const headerCard: CSSProperties = { background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
const emptyMainCard: CSSProperties = { minHeight: 160, background: "#f3f4f6", borderRadius: 14, padding: 30, textAlign: "right" };
const viewBtn: CSSProperties = { border: 0, background: "#dbeafe", color: "#2563eb", borderRadius: 8, padding: "10px 18px", fontWeight: 800 };
const printArea: CSSProperties = { display: "none" };
const printPage: CSSProperties = { width: "100%", minHeight: "auto", background: "white", padding: "8mm 12mm 16mm 12mm", boxSizing: "border-box", direction: "rtl", fontFamily: appFont, color: "#111827", position: "relative" };
const printHeaderArea: CSSProperties = { textAlign: "center", marginBottom: 8, position: "relative" };
const printSmallTop: CSSProperties = { position: "absolute", left: 0, top: 0, fontSize: 9 };
const printInvoiceCode: CSSProperties = { position: "absolute", right: 0, top: 0, fontSize: 9 };
const printCompanyTitle: CSSProperties = { margin: "16px 0 2px", fontSize: 30, fontWeight: 900 };
const printCompanySub: CSSProperties = { fontSize: 14, marginBottom: 4 };
const printCompanyInfo: CSSProperties = { fontSize: 13, marginBottom: 2 };
const printPhoneLine: CSSProperties = { fontSize: 13, marginBottom: 8 };
const printInfoGrid: CSSProperties = { display: "grid", gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)", gap: 8, marginBottom: 8 };
const printInfoBox: CSSProperties = { border: "1px solid #e5e7eb", padding: 8, fontSize: 11, minHeight: 54 };
const printInfoRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, lineHeight: 1.8 };
const printMoneyBox: CSSProperties = { border: "1px solid #e5e7eb", padding: 8, minHeight: 45, marginBottom: 8, fontSize: 11 };
const printBottomGrid: CSSProperties = { display: "grid", gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)", gap: 8, marginTop: 8 };
const printSummaryBox: CSSProperties = { border: "1px solid #e5e7eb", padding: 8, minHeight: 70, fontSize: 11 };
const printSummaryLine: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid #f1f5f9", padding: "4px 0" };
const printExpenseNoteBox: CSSProperties = { marginTop: 8, border: "1px solid #e5e7eb", padding: 8, fontSize: 10, lineHeight: 1.8, background: "#f8fafc" };
const modalOverlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.3)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", zIndex: 99999, justifyContent: "center" };
const modalBox: CSSProperties = { width: 760, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", background: "white", borderRadius: 16, padding: 20, boxShadow: "0 25px 70px rgba(15,23,42,0.25)" };
const confirmBox: CSSProperties = { width: 460, maxWidth: "92vw", background: "rgba(255, 255, 255, 0.8)", border: "1px solid rgba(255, 255, 255, 0.3)", borderRadius: 24, padding: 24, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)", backdropFilter: "blur(12px)", textAlign: "center" };
const confirmText: CSSProperties = { color: "#374151", lineHeight: 1.9, fontWeight: 700, marginBottom: 18 };
const confirmActions: CSSProperties = { display: "grid", gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)", gap: 12 };
const modalHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: 12, marginBottom: 14 };
const modalCloseBtn: CSSProperties = { width: 34, height: 34, borderRadius: "50%", border: "1px solid #d1d5db", background: "white", fontSize: 20, cursor: "pointer" };
const settingsStack: CSSProperties = { display: "grid", gap: 12 };
const settingsSection: CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fafafa" };
const settingsTitle: CSSProperties = { margin: "0 0 10px" };
const settingGrid2: CSSProperties = { display: "grid", gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)", gap: 8 };
const settingCheck: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontWeight: 700 };
const modalFooter: CSSProperties = { marginTop: 14, display: "flex", justifyContent: "flex-start" };
