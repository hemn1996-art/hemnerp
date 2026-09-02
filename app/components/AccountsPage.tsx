"use client";
import FormattedNumberInput from "./FormattedNumberInput";
import { exportTableToExcel } from "../utils/excelExport";

import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { store, useStore } from "../store/store";
import AlertModal from "./AlertModal";
import { currencies as mockCurrencies } from "../data/mockData";
import { normalizeKurdishSearchText } from "../utils/digits";

type ToastType = "error" | "success" | "info";
type BalanceSort = "none" | "desc" | "asc";

type AccountTypeLike = {
  id: number;
  name: string;
  isActive: boolean;
  showInPurchase?: boolean;
  showInSales?: boolean;
};

type AccountLike = {
  id: number;
  name: string;
  accountTypeId?: number;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  district?: string;
  address?: string;
  notes?: string;
  discountPercent?: number;
  creditLimit?: number;
  creditLimitCurrencyId?: number;
  debtAlertDays?: number;
  guarantorName?: string;
  balance: number;
  balanceByCurrency?: Record<string, number>;
  balanceCurrencyId?: number;
  isShareholder?: boolean;
  sharePercentage?: number;
  shareholderBalance?: number;
  shareholderBalanceByCurrency?: Record<string, number>;
  canDelete?: boolean;
  isActive: boolean;
  exchangeRateType?: string;
  customExchangeRate?: number;
  createdAt?: string;
  updatedAt?: string;
};

type AccountForm = {
  name: string;
  accountTypeId: string;
  isShareholder: boolean;
  sharePercentage: string;
  isActive: boolean;
  phone: string;
  email: string;
  country: string;
  city: string;
  district: string;
  address: string;
  notes: string;
  discountPercent: string;
  creditLimit: string;
  creditLimitCurrencyId: number;
  debtAlertDays: string;
  guarantorName: string;
  exchangeRateType: string;
  customExchangeRate: string;
};

type OpenSections = {
  general: boolean;
  address: boolean;
  credit: boolean;
  notes: boolean;
};

const fallbackCountries = ["عێراق"];

const fallbackCities = ["سلێمانی", "هەولێر", "کەرکووک", "دهۆک", "بەغدا"];

const fallbackDistricts = ["بازاڕ", "تەیراوە", "شاری نوێ", "ڕەحیم ئاوا"];

import { useRouter, useSearchParams } from "next/navigation";

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const accountTypesStore = useStore((s: any) => s.accountTypes);
  const storeCurrencies = useStore((s: any) => s.currencies) || [];
  const fetchCurrencies = useStore((s: any) => s.fetchCurrencies);
  const currencies = storeCurrencies.length > 0 ? storeCurrencies : mockCurrencies;
  const fetchAccountTypes = useStore((s: any) => s.fetchAccountTypes);
  const accountTypes = (accountTypesStore || []) as AccountTypeLike[];

  const accountsStore = useStore((s: any) => s.accounts);
  const fetchAccounts = useStore((s: any) => s.fetchAccounts);

  const [accountsState, setAccountsState] = useState<AccountLike[]>([]);

  useEffect(() => {
    fetchAccounts();
    fetchAccountTypes();
  }, [fetchAccounts, fetchAccountTypes]);

  useEffect(() => {
    setAccountsState([...accountsStore]);
  }, [accountsStore]);

  useEffect(() => {
    if (editId && accountsState.length > 0) {
      const accountToEdit = accountsState.find(
        (acc: any) => String(acc.id) === String(editId)
      );
      if (accountToEdit) {
        openEditModal(accountToEdit);
        setShowModal(true);
        // Clear the edit parameter from the URL to avoid reopening on refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({ ...window.history.state }, "", newUrl);
      }
    }
  }, [editId, accountsState]);

  const activeAccountTypes = useMemo(() => {
    return accountTypes.filter((type: any) => type.isActive !== false);
  }, [accountTypes]);

  const [search, setSearch] = useState("");
  const [selectedAccountTypeId, setSelectedAccountTypeId] = useState<string>("all");
  const [balanceSort, setBalanceSort] = useState<BalanceSort>("none");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("error");

  const defaultAccountCols = {
    index: true,
    name: true,
    accountType: true,
    phone: true,
    country: true,
    city: true,
    district: true,
    creditLimit: true,
    balance: true,
    status: true,
    actions: true,
  };

  const [visibleColumns, setVisibleColumns] = useState(defaultAccountCols);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const colsLoadedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("__erp_accounts_page_cols");
      if (stored) {
        setVisibleColumns(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch (e) {
      console.error(e);
    }
    colsLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!colsLoadedRef.current) return;
    try {
      localStorage.setItem("__erp_accounts_page_cols", JSON.stringify(visibleColumns));
    } catch (e) {
      console.error(e);
    }
  }, [visibleColumns]);

  const toggleColumn = (colKey: keyof typeof defaultAccountCols) => {
    setVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, type: "error" | "warning" | "success" | "confirm", title: string, message: string, onConfirm?: () => void}>({isOpen: false, type: "warning", title: "", message: ""});
  const showAlert = (type: any, title: string, message: string, onConfirm?: () => void) => setAlertConfig({isOpen: true, type, title, message, onConfirm});
  const closeAlert = () => setAlertConfig(a => ({...a, isOpen: false}));

  const [openSections, setOpenSections] = useState<OpenSections>({
    general: true,
    address: false,
    credit: false,
    notes: false,
  });

  const [form, setForm] = useState<AccountForm>({
    name: "",
    accountTypeId: "",
    isShareholder: false,
    sharePercentage: "0",
    isActive: true,
    phone: "",
    email: "",
    country: "عێراق",
    city: "",
    district: "",
    address: "",
    notes: "",
    discountPercent: "0",
    creditLimit: "0",
    creditLimitCurrencyId: 1,
    debtAlertDays: "0",
    guarantorName: "",
    exchangeRateType: "DAILY_MARKET",
    customExchangeRate: "132000",
  });

  const countryOptions = useMemo(() => {
    return unique([
      ...fallbackCountries,
      ...accountsState.map((account: any) => account.country || "").filter(Boolean),
    ]);
  }, [accountsState]);

  const cityOptions = useMemo(() => {
    const fromAccounts = accountsState
      .filter((account: any) => !form.country || account.country === form.country)
      .map((account: any) => account.city || "")
      .filter(Boolean);

    return unique([...fallbackCities, ...fromAccounts]);
  }, [accountsState, form.country]);

  const districtOptions = useMemo(() => {
    const fromAccounts = accountsState
      .filter((account: any) => !form.country || account.country === form.country)
      .filter((account: any) => !form.city || account.city === form.city)
      .map((account: any) => account.district || "")
      .filter(Boolean);

    return unique([...fallbackDistricts, ...fromAccounts]);
  }, [accountsState, form.country, form.city]);

  const filteredAccounts = useMemo(() => {
    const q = normalizeKurdishSearchText(search).trim();

    return accountsState.filter((account: any) => {
      if (account.isShareholder === true) return false;

      // Filter by Account Type
      if (selectedAccountTypeId !== "all") {
        if (String(account.accountTypeId) !== String(selectedAccountTypeId)) {
          return false;
        }
      }

      const accountTypeName = account.isShareholder
        ? "خاوەن پشک"
        : getAccountTypeName(account.accountTypeId);

      const addressText = getAddressText(account);

      if (!q) return true;

      return (
        normalizeKurdishSearchText(account.name || "").includes(q) ||
        normalizeKurdishSearchText(account.phone || "").includes(q) ||
        normalizeKurdishSearchText(accountTypeName || "").includes(q) ||
        normalizeKurdishSearchText(addressText || "").includes(q)
      );
    });
  }, [accountsState, search, selectedAccountTypeId, accountTypes]);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortColumn(colKey);
      setSortDirection("desc");
    }
  };

  const sortedAccounts = useMemo(() => {
    if (!sortColumn) {
      if (balanceSort === "desc") {
        return [...filteredAccounts].sort((a, b) => Math.abs(Number(b.balance || 0)) - Math.abs(Number(a.balance || 0)));
      }
      if (balanceSort === "asc") {
        return [...filteredAccounts].sort((a, b) => Math.abs(Number(a.balance || 0)) - Math.abs(Number(b.balance || 0)));
      }
      return filteredAccounts;
    }

    return [...filteredAccounts].sort((a: any, b: any) => {
      let valA: any = "";
      let valB: any = "";

      if (sortColumn === "name") {
        valA = a.name || "";
        valB = b.name || "";
        return sortDirection === "desc" ? valB.localeCompare(valA, "ckb") : valA.localeCompare(valB, "ckb");
      } else if (sortColumn === "accountType") {
        valA = getAccountTypeName(a.accountTypeId) || "";
        valB = getAccountTypeName(b.accountTypeId) || "";
        return sortDirection === "desc" ? valB.localeCompare(valA, "ckb") : valA.localeCompare(valB, "ckb");
      } else if (sortColumn === "phone") {
        valA = a.phone || "";
        valB = b.phone || "";
        return sortDirection === "desc" ? valB.localeCompare(valA) : valA.localeCompare(valB);
      } else if (sortColumn === "country") {
        valA = a.country || "";
        valB = b.country || "";
        return sortDirection === "desc" ? valB.localeCompare(valA, "ckb") : valA.localeCompare(valB, "ckb");
      } else if (sortColumn === "city") {
        valA = a.city || "";
        valB = b.city || "";
        return sortDirection === "desc" ? valB.localeCompare(valA, "ckb") : valA.localeCompare(valB, "ckb");
      } else if (sortColumn === "district") {
        valA = a.district || "";
        valB = b.district || "";
        return sortDirection === "desc" ? valB.localeCompare(valA, "ckb") : valA.localeCompare(valB, "ckb");
      } else if (sortColumn === "creditLimit") {
        valA = a.creditLimit || 0;
        valB = b.creditLimit || 0;
        return sortDirection === "desc" ? valB - valA : valA - valB;
      } else if (sortColumn === "balance") {
        valA = Math.abs(Number(a.balance || 0));
        valB = Math.abs(Number(b.balance || 0));
        return sortDirection === "desc" ? valB - valA : valA - valB;
      } else if (sortColumn === "status") {
        valA = a.isActive ? 1 : 0;
        valB = b.isActive ? 1 : 0;
        return sortDirection === "desc" ? valB - valA : valA - valB;
      }
      return 0;
    });
  }, [filteredAccounts, sortColumn, sortDirection, balanceSort, accountTypes]);

  function syncAccounts(nextAccounts: AccountLike[]) {
    setAccountsState(nextAccounts);
    (store as any).accounts = nextAccounts;
  }

  function unique(list: string[]) {
    return Array.from(new Set(list.filter(Boolean)));
  }

  function showToast(message: string, type: ToastType = "error") {
    setToastMessage(message);
    setToastType(type);
    window.setTimeout(() => setToastMessage(""), 3500);
  }

  function toggleSection(key: keyof OpenSections) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function resetSections() {
    setOpenSections({
      general: true,
      address: false,
      credit: false,
      notes: false,
    });
  }

  function onlyPositiveDecimal(value: string) {
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

  function getNextId() {
    return accountsState.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
  }

  function getAccountTypeName(accountTypeId?: number) {
    if (!accountTypeId) return "-";

    return (
      accountTypes.find((type: any) => Number(type.id) === Number(accountTypeId))
        ?.name || "-"
    );
  }

  function getCurrencySymbol(currencyId?: number) {
    return currencies.find((currency: any) => currency.id === currencyId)?.symbol || "$";
  }

  function getBalanceColor(balance: number) {
    if (balance > 0) return "#16a34a";
    if (balance < 0) return "#dc2626";
    return "#64748b";
  }

  function formatMoney(value: number, currencyId = 1) {
    const symbol = getCurrencySymbol(currencyId);
    const absNum = Math.abs(Number(value || 0));
    const isIQD = currencyId === 2 || currencyId === 12 || symbol === "دینار" || symbol === "IQD";
    const formatted = absNum.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: isIQD ? 0 : 2
    });

    const parts = formatted.split('.');
    const wholePart = parts[0];
    const decimalPart = parts[1];

    if (isIQD) {
      return (
        <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "baseline", gap: "4px" }} dir="ltr">
          <span style={{ opacity: 0.9, fontSize: "0.85em", fontWeight: 800 }}>دینار</span>
          <span>{wholePart}</span>
          {decimalPart && decimalPart !== "0" && decimalPart !== "00" && (
            <span style={{ fontSize: "0.7em", opacity: 0.8 }}>.{decimalPart}</span>
          )}
        </span>
      );
    }
    return (
      <span style={{ display: "inline-flex", flexDirection: "row", alignItems: "baseline", gap: "3px" }} dir="ltr">
        <span style={{ opacity: 0.8, fontSize: "0.85em", fontWeight: 800 }}>{symbol}</span>
        <span>{wholePart}</span>
        {decimalPart && decimalPart !== "0" && decimalPart !== "00" && (
          <span style={{ fontSize: "0.7em", opacity: 0.8 }}>.{decimalPart}</span>
        )}
      </span>
    );
  }

  function getAddressText(account: AccountLike) {
    return account.address?.trim() || "-";
  }

  function formatNormalAccountBalance(account: AccountLike) {
    const map = account.balanceByCurrency || {};
    const entries = Object.entries(map)
      .filter(([, value]) => Math.abs(Number(value || 0)) > 0.0001);

    const isFixedRate = account.exchangeRateType === "FIXED";
    const fixedRateText = account.customExchangeRate 
      ? `نرخی جێگیری 100$: ${Number(account.customExchangeRate).toLocaleString("en-US")} دینار`
      : `نرخی جێگیری 100$`;

    if (entries.length === 0) {
      return <span style={{ color: "#64748b", fontWeight: 955 }}>0</span>;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
        {entries.map(([currencyIdText, value]) => {
          const val = Number(value || 0);
          const curId = Number(currencyIdText);
          const normalColor = val > 0 ? "#16a34a" : val < 0 ? "#dc2626" : "#64748b";

          if (isFixedRate) {
            return (
              <span
                key={currencyIdText}
                title={fixedRateText}
                style={{
                  color: "#6b21a8",
                  backgroundColor: "#f3e8ff",
                  border: "1.5px solid #c084fc",
                  padding: "4px 12px",
                  borderRadius: "10px",
                  fontWeight: 950,
                  fontSize: "15px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 1px 3px rgba(107,33,168,0.12)"
                }}
                dir="ltr"
              >
                {formatMoney(val, curId)}
              </span>
            );
          }

          return (
            <span key={currencyIdText} style={{ color: normalColor, fontWeight: 950 }} dir="ltr">
              {formatMoney(val, curId)}
            </span>
          );
        })}
      </div>
    );
  }

  function formatShareholderBalance(account: AccountLike) {
    const map = account.shareholderBalanceByCurrency || {};
    const entries = Object.entries(map)
      .filter(([, value]) => Math.abs(Number(value || 0)) > 0.0001);

    if (entries.length === 0) {
      if (typeof account.shareholderBalance === "number" && Math.abs(account.shareholderBalance) > 0.0001) {
        return <span style={{ color: "#2563eb", fontWeight: 955 }}>{formatMoney(account.shareholderBalance, 1)}</span>;
      }
      return <span style={{ color: "#64748b", fontWeight: 955 }}>0</span>;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
        {entries.map(([currencyIdText, value]) => {
          const val = Number(value || 0);
          const curId = Number(currencyIdText);
          return (
            <span key={currencyIdText} style={{ color: "#2563eb", fontWeight: 955 }} dir="ltr">
              {formatMoney(val, curId)}
            </span>
          );
        })}
      </div>
    );
  }

  function resetForm() {
    setEditingId(null);

    setForm({
      name: "",
      accountTypeId: "",
      isShareholder: false,
      sharePercentage: "0",
      isActive: true,
      phone: "",
      email: "",
      country: "عێراق",
      city: "",
      district: "",
      address: "",
      notes: "",
      discountPercent: "0",
      creditLimit: "0",
      creditLimitCurrencyId: 1,
      debtAlertDays: "0",
      guarantorName: "",
      exchangeRateType: "DAILY_MARKET",
      customExchangeRate: "132000",
    });
  }

  function openAddModal() {
    resetForm();
    resetSections();
    setShowModal(true);
  }

  function openEditModal(account: AccountLike) {
    setEditingId(account.id);

    setForm({
      name: account.name || "",
      accountTypeId: account.accountTypeId ? String(account.accountTypeId) : "",
      isShareholder: Boolean(account.isShareholder),
      sharePercentage: String(account.sharePercentage ?? 0),
      isActive: account.isActive !== false,
      phone: account.phone || "",
      email: account.email || "",
      country: account.country || "عێراق",
      city: account.city || "",
      district: account.district || "",
      address: account.address || "",
      notes: account.notes || "",
      discountPercent: String(account.discountPercent ?? 0),
      creditLimit: String(account.creditLimit ?? 0),
      creditLimitCurrencyId: account.creditLimitCurrencyId || 1,
      debtAlertDays: String(account.debtAlertDays ?? 0),
      guarantorName: account.guarantorName || "",
      exchangeRateType: account.exchangeRateType || "DAILY_MARKET",
      customExchangeRate: String(account.customExchangeRate ?? 132000),
    });

    resetSections();
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    resetForm();
    resetSections();
  }

  function validateForm() {
    const name = form.name.trim();

    if (!name) {
      showToast("تکایە ناوی هەژمار بنووسە.");
      return false;
    }

    if (!form.isShareholder && !form.accountTypeId) {
      showToast("تکایە جۆری هەژمار هەڵبژێرە.");
      return false;
    }

    if (form.accountTypeId && !form.isShareholder) {
      const type = activeAccountTypes.find(
        (item: any) => Number(item.id) === Number(form.accountTypeId)
      );

      if (!type) {
        showToast("ئەم جۆری هەژمارە ناچالاکە یان نەدۆزرایەوە.");
        return false;
      }
    }

    const duplicated = accountsState.find((account: any) => {
      return (
        account.id !== editingId &&
        String(account.name || "").trim().toLowerCase() ===
          name.toLowerCase()
      );
    });

    if (duplicated) {
      showToast("ئەم ناوی هەژمارە پێشتر هەیە.");
      return false;
    }

    return true;
  }

  function handleSave() {
    if (!validateForm()) return;

    if (editingId) {
      // نوێکردنەوەی هەژمار بە API — دیتابەیس ذخیرە دەکات
      const apiData = {
        id: editingId,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        fullAddress: form.address.trim() || undefined,
        accountTypeId: form.isShareholder ? undefined : Number(form.accountTypeId) || undefined,
        isShareholder: form.isShareholder,
        sharePercentage: form.isShareholder ? toNumber(form.sharePercentage) : 0,
        isActive: form.isActive,
        creditLimit: toNumber(form.creditLimit),
        creditLimitCurrencyId: Number(form.creditLimitCurrencyId),
        debtAlertDays: toNumber(form.debtAlertDays),
        discountPercent: toNumber(form.discountPercent),
        guarantorName: form.guarantorName.trim() || undefined,
        notes: form.notes.trim() || undefined,
        exchangeRateType: form.exchangeRateType,
        customExchangeRate: toNumber(form.customExchangeRate) || 132000,
      };

      closeModal();

      store.updateAccount(apiData).then((result: any) => {
        if (result) {
          showToast("هەژمار نوێکرایەوە ✅", "success");
        } else {
          showToast("هەڵەیەک ڕووی دا. هەژمار خەزن نەکرا.", "error");
        }
      });
    } else {
      // دروستکردنی هەژماری نوێ بە API — دیتابەیس ذخیرە دەکات
      const apiData = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        fullAddress: form.address.trim() || undefined,
        accountTypeId: form.isShareholder ? undefined : Number(form.accountTypeId) || undefined,
        isShareholder: form.isShareholder,
        sharePercentage: form.isShareholder ? toNumber(form.sharePercentage) : 0,
        isActive: form.isActive,
        exchangeRateType: form.exchangeRateType,
        customExchangeRate: toNumber(form.customExchangeRate) || 132000,
      };

      store.addAccount(apiData).then((result: any) => {
        if (result) {
          showToast("هەژمار زیادکرا ✅", "success");
        } else {
          showToast("هەڵەیەک ڕووی دا. هەژمار خەزن نەکرا.", "error");
        }
      });

      closeModal();
    }
  }

  function hasNonZeroBalance(account: AccountLike) {
    if (Math.abs(Number(account.balance || 0)) > 0.0001) return true;

    if (Math.abs(Number(account.shareholderBalance || 0)) > 0.0001) {
      return true;
    }

    const map = account.shareholderBalanceByCurrency || {};

    return Object.values(map).some(
      (value) => Math.abs(Number(value || 0)) > 0.0001
    );
  }

  function hasAccountTransactions(accountId: number) {
    const invoices = ((store as any).invoices || []) as any[];

    return invoices.some((invoice: any) => {
      return (
        Number(invoice.accountId) === Number(accountId) ||
        Number(invoice.shareholderAccountId) === Number(accountId) ||
        Number(invoice.supplierId) === Number(accountId) ||
        Number(invoice.customerId) === Number(accountId) ||
        Number(invoice.employeeAccountId) === Number(accountId)
      );
    });
  }

  function canDeleteAccount(account: AccountLike) {
    if (hasNonZeroBalance(account)) return false;
    if (hasAccountTransactions(account.id)) return false;
    return true;
  }

  function handleDelete(account: AccountLike) {
    if (!canDeleteAccount(account)) return;

    showAlert("confirm", "دڵنیایت لە سڕینەوە؟", `ئایا دڵنیایت لە سڕینەوەی هەژماری "${account.name}"؟`, () => {
      closeAlert();
      const nextAccounts = accountsState.filter((item: any) => item.id !== account.id);
      syncAccounts(nextAccounts);
      showToast("هەژمار سڕایەوە ✅", "success");
    });
  }

  function toggleBalanceSort() {
    setBalanceSort((prev) =>
      prev === "none" ? "desc" : prev === "desc" ? "asc" : "desc"
    );
  }

  return (
    <div style={page}>
      <AlertModal {...alertConfig} onClose={closeAlert} />
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

      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
            className="sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gradient-to-b from-[#061f5f] to-[#03133f] text-white rounded-xl shadow-sm border border-[#ffffff20] transition-transform hover:scale-105 cursor-pointer text-xl"
            title="گەورەکردنی سایدبار"
          >
            ☰
          </button>
          <div>
            <h1 style={title}>هەژمار</h1>
            <p style={subtitle}>دروستکردن و بەڕێوەبردنی هەژمارەکان.</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={primaryBtn} onClick={openAddModal}>
            زیادکردن
          </button>
        </div>
      </div>

      <div style={toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="گەڕان بە ناو، ژمارە، جۆری هەژمار، ناونیشان..."
          style={searchInput}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <select
              value={selectedAccountTypeId}
              onChange={(event) => setSelectedAccountTypeId(event.target.value)}
              style={{
                height: 38,
                padding: "0 34px 0 14px",
                borderRadius: 10,
                border: selectedAccountTypeId !== "all" ? "1.5px solid #3b82f6" : "1.5px solid #cbd5e1",
                background: selectedAccountTypeId !== "all" ? "#eff6ff" : "#ffffff",
                color: selectedAccountTypeId !== "all" ? "#1d4ed8" : "#334155",
                fontWeight: 900,
                fontSize: 13,
                fontFamily: appFont,
                cursor: "pointer",
                outline: "none",
                appearance: "none",
                WebkitAppearance: "none",
                minWidth: 170,
                transition: "all 0.15s ease",
                boxShadow: selectedAccountTypeId !== "all" ? "0 0 0 2px rgba(59, 130, 246, 0.2)" : "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              <option value="all">هەموو جۆرەکانی هەژمار</option>
              {activeAccountTypes.map((type: any) => (
                <option key={type.id} value={String(type.id)}>
                  {type.name}
                </option>
              ))}
            </select>
            <div style={{
              position: "absolute",
              left: 10,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              color: selectedAccountTypeId !== "all" ? "#1d4ed8" : "#64748b"
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <button
            onClick={() => exportTableToExcel("accounts-list-table", "hejmari_gisti.xlsx")}
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "0 16px",
              fontWeight: 900,
              cursor: "pointer",
              height: 38,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              gap: 6,
              boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)"
            }}
          >
            ناردن بۆ ئێکسڵ 📊
          </button>
          <button
            onClick={() => setShowColumnModal(true)}
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "0 18px",
              fontWeight: 900,
              cursor: "pointer",
              height: 38,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              gap: 8,
              boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)",
              transition: "all 0.15s ease"
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#bae6fd" }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
            <span>کۆڵۆمەکان</span>
          </button>
          <div style={countBadge}>
            کۆی هەژمار: {filteredAccounts.length.toLocaleString("en-US")}
          </div>
        </div>
      </div>

      <div style={tableCard}>
        <div style={{ overflowX: "auto" }}>
          <table id="accounts-list-table" style={table}>
            <thead>
              <tr>
                {visibleColumns.index && <th style={th}>#</th>}
                {visibleColumns.name && (
                  <th style={{ ...th, cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("name")} title="کلیک بکە بۆ ڕێکخستنی بەپێی پیت">
                    ناو {sortColumn === "name" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                  </th>
                )}
                {visibleColumns.accountType && (
                  <th style={{ ...th, cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("accountType")} title="کلیک بکە بۆ ڕێکخستنی بەپێی پیت">
                    جۆری هەژمار {sortColumn === "accountType" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                  </th>
                )}
                {visibleColumns.phone && (
                  <th style={th}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#475569" }}>
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                      <span>ژمارەی تەلەفۆن</span>
                    </div>
                  </th>
                )}
                {visibleColumns.country && (
                  <th style={{ ...th, cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("country")} title="کلیک بکە بۆ ڕێکخستنی بەپێی پیت">
                    وڵات {sortColumn === "country" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                  </th>
                )}
                {visibleColumns.city && (
                  <th style={{ ...th, cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("city")} title="کلیک بکە بۆ ڕێکخستنی بەپێی پیت">
                    شار {sortColumn === "city" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                  </th>
                )}
                {visibleColumns.district && (
                  <th style={{ ...th, cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("district")} title="کلیک بکە بۆ ڕێکخستنی بەپێی پیت">
                    گەڕەک {sortColumn === "district" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                  </th>
                )}
                {visibleColumns.creditLimit && (
                  <th style={{ ...th, cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("creditLimit")} title="کلیک بکە بۆ ڕێکخستنی بەپێی بڕ">
                    سنووری قەرزی تێپەڕاندووە {sortColumn === "creditLimit" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                  </th>
                )}
                {visibleColumns.balance && (
                  <th
                    style={{ ...th, cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("balance")}
                    title="کلیک بکە بۆ ڕێکخستنی باڵانس"
                  >
                    باڵانس {sortColumn === "balance" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⇅"}
                  </th>
                )}
                {visibleColumns.status && (
                  <th style={{ ...th, cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("status")} title="کلیک بکە بۆ ڕێکخستنی دۆخ">
                    دۆخ {sortColumn === "status" ? (sortDirection === "desc" ? " ⬇" : " ⬆") : " ⬆"}
                  </th>
                )}
                {visibleColumns.actions && <th style={th}>چالاکی</th>}
              </tr>
            </thead>

            <tbody>
              {sortedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={12} style={emptyCell}>
                    هیچ هەژمارێک نەدۆزرایەوە.
                  </td>
                </tr>
              ) : (
                sortedAccounts.map((account, index) => {
                  const balance = Number(account.balance || 0);
                  const creditLimit = Number(account.creditLimit || 0);
                  const overCreditLimit =
                    !account.isShareholder &&
                    creditLimit > 0 &&
                    Math.abs(balance) > creditLimit;

                  const canDelete = typeof account.canDelete === "boolean" ? account.canDelete : canDeleteAccount(account);

                  return (
                    <tr key={account.id}>
                      {visibleColumns.index && <td style={tdCenter}>{index + 1}</td>}

                      {visibleColumns.name && (
                        <td style={tdName}>
                          <strong>{account.name}</strong>
                        </td>
                      )}

                      {visibleColumns.accountType && (
                        <td style={tdCenter}>
                          {account.isShareholder
                            ? "خاوەن پشک"
                            : getAccountTypeName(account.accountTypeId)}
                        </td>
                      )}

                      {visibleColumns.phone && <td style={tdCenter}>{account.phone || "-"}</td>}
                      {visibleColumns.country && <td style={tdCenter}>{account.country || "-"}</td>}
                      {visibleColumns.city && <td style={tdCenter}>{account.city || "-"}</td>}
                      {visibleColumns.district && <td style={tdCenter}>{account.district || "-"}</td>}

                      {visibleColumns.creditLimit && (
                        <td style={tdCenter}>
                          {overCreditLimit ? (
                            <span style={yesBadge}>بەڵێ</span>
                          ) : (
                            <span style={noBadge}>نەخێر</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.balance && (
                        <td style={tdCenter}>
                          {account.isShareholder ? (
                            <span style={{ color: "#2563eb", fontWeight: 900 }}>
                              {formatShareholderBalance(account)}
                            </span>
                          ) : (
                            <span
                              style={{
                                color: getBalanceColor(balance),
                                fontWeight: 900,
                              }}
                            >
                              {formatNormalAccountBalance(account)}
                            </span>
                          )}
                        </td>
                      )}

                      {visibleColumns.status && (
                        <td style={tdCenter}>
                          {account.isActive !== false ? (
                            <span style={activeBadge}>چالاک</span>
                          ) : (
                            <span style={inactiveBadge}>ناچالاک</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.actions && (
                        <td style={tdActions}>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span style={deleteSlot}>
                              {canDelete && (
                                <button
                                  style={smallDeleteMarkBtn}
                                  onClick={() => handleDelete(account)}
                                  title="سڕینەوە"
                                >
                                  ×
                                </button>
                              )}
                            </span>

                            <button
                              style={{
                                background: "linear-gradient(135deg, #10b981, #059669)",
                                color: "white",
                                border: "none",
                                borderRadius: 8,
                                padding: "0 16px",
                                fontWeight: 700,
                                cursor: "pointer",
                                minWidth: 110,
                                height: 34,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)"
                              }}
                              onClick={() => router.push(`/reports/account-statement?accountId=${account.id}`)}
                            >
                              کەشف حساب
                            </button>

                            <button
                              style={smallBlueBtn}
                              onClick={() => openEditModal(account)}
                            >
                              گۆڕانکاری
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0 }}>
                {editingId ? "گۆڕانکاری هەژمار" : "زیادکردنی هەژمار"}
              </h2>

              <button style={modalCloseBtn} onClick={closeModal}>
                ×
              </button>
            </div>

            <div style={modalBody}>
              <CollapsibleSection
                title="زانیاری گشتی"
                open={openSections.general}
                onToggle={() => toggleSection("general")}
              >
                <div style={grid3}>
                  <Field label="ناو">
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      style={input}
                      placeholder="ناوی هەژمار"
                    />
                  </Field>

                  <Field label="ژمارە تەلەفۆن">
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          phone: event.target.value,
                        }))
                      }
                      style={input}
                      inputMode="numeric"
                      lang="en"
                      dir="ltr"
                      placeholder="0770..."
                    />
                  </Field>

                  <Field label="ئیمەیل">
                    <input
                      value={form.email}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                      style={input}
                      dir="ltr"
                      placeholder="email@example.com"
                    />
                  </Field>
                </div>

                <div style={typeShareholderRow}>
                  <div style={{ flex: 1 }}>
                    <Field label="جۆری هەژمار">
                      <select
                        value={form.accountTypeId}
                        disabled={form.isShareholder}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            accountTypeId: event.target.value,
                          }))
                        }
                        style={{
                          ...input,
                          background: form.isShareholder ? "#f3f4f6" : "white",
                          cursor: form.isShareholder ? "not-allowed" : "pointer",
                        }}
                      >
                        <option value="">جۆری هەژمار هەڵبژێرە</option>
                        {activeAccountTypes.map((type: any) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <label style={shareholderMiniBox}>
                    <input
                      type="checkbox"
                      checked={form.isShareholder}
                      onChange={(event) => {
                        const isChecking = event.target.checked;
                        const wasShareholderBefore = editingId && accountsState.find((a: any) => a.id === editingId)?.isShareholder;
                        if (isChecking || wasShareholderBefore) {
                          // Show warning when changing shareholder status
                        }
                        setForm((prev) => ({
                          ...prev,
                          isShareholder: isChecking,
                          accountTypeId: isChecking ? "" : prev.accountTypeId,
                          sharePercentage: isChecking ? prev.sharePercentage : "0",
                        }));
                      }}
                    />
                    <span>خاوەن پشکە؟</span>
                  </label>

                  <label style={activeMiniBox}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    <span>چالاک</span>
                  </label>
                </div>

                {/* Exchange Rate Type Selection for Accounts */}
                {!form.isShareholder && (
                  <div style={{ marginTop: 14, padding: "14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #cbd5e1" }}>
                    <div style={{ fontWeight: "800", marginBottom: 10, color: "#1e293b", fontSize: "13px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>💱</span>
                      <span>جۆری نرخی ئاڵوگۆڕی دۆلار</span>
                    </div>
                    <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 700, fontSize: "13px", color: "#334155" }}>
                        <input
                          type="radio"
                          name="exchangeRateType"
                          value="DAILY_MARKET"
                          checked={form.exchangeRateType === "DAILY_MARKET"}
                          onChange={() => setForm(prev => ({ ...prev, exchangeRateType: "DAILY_MARKET" }))}
                        />
                        <span>نرخی دۆلاری ڕۆژ (گەڵای ڕۆژ)</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 700, fontSize: "13px", color: "#6b21a8" }}>
                        <input
                          type="radio"
                          name="exchangeRateType"
                          value="FIXED"
                          checked={form.exchangeRateType === "FIXED"}
                          onChange={() => setForm(prev => ({ ...prev, exchangeRateType: "FIXED" }))}
                        />
                        <span>نرخی جێگیر بۆ 100$</span>
                      </label>
                    </div>

                    {form.exchangeRateType === "FIXED" && (
                      <div style={{ marginTop: 12, maxWidth: 280 }}>
                        <Field label="بڕی نرخی جێگیری 100$ (دینار)">
                          <FormattedNumberInput
                            value={Number(form.customExchangeRate) || 0}
                            onChange={(val) => setForm(prev => ({ ...prev, customExchangeRate: String(val) }))}
                            style={{ ...input, border: "2px solid #8b5cf6", background: "#f5f3ff", fontWeight: "800", color: "#6b21a8" }}
                            placeholder="١٣٢٠٠٠"
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                )}

                {/* Shareholder percentage + warning */}
                {form.isShareholder && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{
                      background: "linear-gradient(135deg, #fef2f2, #fff1f2)",
                      border: "2px solid #ef4444",
                      borderRadius: 12,
                      padding: "12px 16px",
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}>
                      <span style={{ fontSize: 22 }}>⚠️</span>
                      <div>
                        <div style={{ color: "#b91c1c", fontWeight: 900, fontSize: 13, marginBottom: 2 }}>ئاگاداری گرنگ!</div>
                        <div style={{ color: "#dc2626", fontWeight: 700, fontSize: 12, lineHeight: 1.6 }}>
                          تکایە پێش گۆڕینی ڕێژەی پشکداری یان زیاد/لابردنی خاوەن پشک، ڕێکخستنەوەی قازانجی خاوەن پشکەکان بکە لە بەشی میزانیەدا!
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <Field label="ڕێژەی پشکداری (%)">
                        <input
                          value={form.sharePercentage}
                          onChange={(event) => {
                            const val = onlyPositiveDecimal(event.target.value);
                            if (Number(val) > 100) return;
                            setForm((prev) => ({ ...prev, sharePercentage: val }));
                          }}
                          style={input}
                          inputMode="decimal"
                          dir="ltr"
                          placeholder="0"
                        />
                      </Field>
                      <div style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                        {(() => {
                          const otherShareholdersTotal = accountsState
                            .filter((a: any) => a.isShareholder && a.id !== editingId)
                            .reduce((sum: number, a: any) => sum + (a.sharePercentage || 0), 0);
                          const remaining = 100 - otherShareholdersTotal - toNumber(form.sharePercentage);
                          return (
                            <span style={{ color: remaining < 0 ? "#dc2626" : "#16a34a" }}>
                              {remaining < 0 ? `⛔ ${Math.abs(remaining).toFixed(2)}% زیاترە!` : `✅ ${remaining.toFixed(2)}% ماوە`}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="ناونیشان"
                open={openSections.address}
                onToggle={() => toggleSection("address")}
              >
                <div style={grid3}>
                  <Field label="وڵات">
                    <select
                      value={form.country}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          country: event.target.value,
                          city: "",
                          district: "",
                        }))
                      }
                      style={input}
                    >
                      <option value="">وڵات هەڵبژێرە</option>
                      {countryOptions.map((item: any) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="شار">
                    <select
                      value={form.city}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          city: event.target.value,
                          district: "",
                        }))
                      }
                      style={input}
                    >
                      <option value="">شار هەڵبژێرە</option>
                      {cityOptions.map((item: any) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="گەڕەک">
                    <select
                      value={form.district}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          district: event.target.value,
                        }))
                      }
                      style={input}
                    >
                      <option value="">گەڕەک هەڵبژێرە</option>
                      {districtOptions.map((item: any) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="ناونیشانی تەواو">
                  <input
                    value={form.address}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        address: event.target.value,
                      }))
                    }
                    style={input}
                    placeholder="ناونیشانی تەواو"
                  />
                </Field>
              </CollapsibleSection>

              <CollapsibleSection
                title="سنووری قەرز و داشکاندن"
                open={openSections.credit}
                onToggle={() => toggleSection("credit")}
              >
                <div style={grid3}>
                  <Field label="داشکاندن %">
                    <FormattedNumberInput
                      value={form.discountPercent}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          discountPercent: val,
                        }))
                      }
                      style={input}
                    />
                  </Field>

                  <Field label="سنووری قەرز">
                    <FormattedNumberInput
                      value={form.creditLimit}
                      onChange={(val) =>
                        setForm((prev) => ({
                          ...prev,
                          creditLimit: val,
                        }))
                      }
                      style={input}
                    />
                  </Field>

                  <Field label="دراوی سنووری قەرز">
                    <select
                      value={form.creditLimitCurrencyId}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          creditLimitCurrencyId: Number(event.target.value),
                        }))
                      }
                      style={input}
                    >
                      {currencies.map((currency: any) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.name} - {currency.symbol}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div style={grid2}>
                  <Field label="ئاگادارکردنەوەی قەرز / ڕۆژ">
                    <input
                      value={form.debtAlertDays}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          debtAlertDays: onlyPositiveDecimal(
                            event.target.value
                          ),
                        }))
                      }
                      style={input}
                      inputMode="numeric"
                      lang="en"
                      dir="ltr"
                    />
                  </Field>

                  <Field label="کەسی گەرەنتی / پەیوەندیدار">
                    <input
                      value={form.guarantorName}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          guarantorName: event.target.value,
                        }))
                      }
                      style={input}
                    />
                  </Field>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="تێبینی"
                open={openSections.notes}
                onToggle={() => toggleSection("notes")}
              >
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  style={textarea}
                  rows={3}
                  placeholder="تێبینی..."
                />
              </CollapsibleSection>
            </div>

            <div style={modalFooter}>
              <button style={outlineBtn} onClick={closeModal}>
                پاشگەزبوونەوە
              </button>

              <button style={primaryBtn} onClick={handleSave}>
                خەزنکردن
              </button>
            </div>
          </div>
        </div>
      )}

      {showColumnModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setShowColumnModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              width: "100%",
              maxWidth: 380,
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #061f5f, #03133f)",
                color: "white",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#38bdf8" }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <path d="M3 9h18" />
                  <path d="M3 15h18" />
                </svg>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>کۆڵۆمە دیاریکراوەکان</h3>
              </div>
              <button
                onClick={() => setShowColumnModal(false)}
                style={{ background: "transparent", border: 0, color: "white", fontSize: 22, cursor: "pointer", fontWeight: 900 }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "60vh", overflowY: "auto" }}>
                {[
                  { key: "index", label: "# (ژمارەی ڕێز)" },
                  { key: "name", label: "ناو" },
                  { key: "accountType", label: "جۆری هەژمار" },
                  { key: "phone", label: "ژمارەی تەلەفۆن" },
                  { key: "country", label: "وڵات" },
                  { key: "city", label: "شار" },
                  { key: "district", label: "گەڕەک" },
                  { key: "creditLimit", label: "سنووری قەرزی تێپەڕاندووە" },
                  { key: "balance", label: "باڵانس" },
                  { key: "status", label: "دۆخ" },
                  { key: "actions", label: "چالاکی" },
                ].map((col) => (
                  <label
                    key={col.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#1e293b"
                    }}
                  >
                    <span>{col.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(visibleColumns[col.key as keyof typeof visibleColumns])}
                      onChange={() => toggleColumn(col.key as keyof typeof visibleColumns)}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", gap: 10 }}>
                <button
                  onClick={() => setShowColumnModal(false)}
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 20px",
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: 13
                  }}
                >
                  جێبەجێکردن ✔️
                </button>
                <button
                  onClick={() => {
                    setVisibleColumns(defaultAccountCols);
                  }}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: "8px 16px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: 12
                  }}
                >
                  ڕێکخستنەوە 🔄
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section style={section}>
      <button type="button" style={sectionHeaderBtn} onClick={onToggle}>
        <span>{title}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && <div style={sectionBody}>{children}</div>}
    </section>
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

const appFont = '"Speda", "Segoe UI", Tahoma, Arial, sans-serif';

const page: CSSProperties = {
  direction: "rtl",
  fontFamily: appFont,
  padding: 18,
  color: "#111827",
};

const toastBar: CSSProperties = {
  position: "fixed",
  top: 12,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 99999,
  minWidth: 360,
  maxWidth: "80vw",
  padding: "12px 18px",
  borderRadius: 10,
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

const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
  marginBottom: 16,
};

const title: CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontWeight: 900,
};

const subtitle: CSSProperties = {
  margin: "7px 0 0",
  color: "#6b7280",
  fontWeight: 700,
  lineHeight: 1.8,
};

const toolbar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 12,
  marginBottom: 16,
};

const searchInput: CSSProperties = {
  width: 440,
  maxWidth: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontFamily: appFont,
  fontSize: 15,
};

const countBadge: CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  padding: "8px 14px",
  fontWeight: 900,
};

const tableCard: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
};

const table: CSSProperties = {
  width: "100%",
  minWidth: 800,
  borderCollapse: "collapse",
};

const th: CSSProperties = {
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  padding: 12,
  textAlign: "center",
  fontWeight: 900,
  color: "#374151",
};

const tdCenter: CSSProperties = {
  borderBottom: "1px solid #eef2f7",
  padding: 12,
  textAlign: "center",
  verticalAlign: "middle",
};

const tdName: CSSProperties = {
  borderBottom: "1px solid #eef2f7",
  padding: 12,
  minWidth: 220,
  verticalAlign: "middle",
};

const tdActions: CSSProperties = {
  borderBottom: "1px solid #eef2f7",
  padding: 12,
  textAlign: "center",
  verticalAlign: "middle",
};

const actionGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "32px 92px",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: 132,
  margin: "0 auto",
};

const deleteSlot: CSSProperties = {
  width: 32,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const yesBadge: CSSProperties = {
  display: "inline-block",
  background: "#dcfce7",
  color: "#15803d",
  border: "1px solid #bbf7d0",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 900,
};

const noBadge: CSSProperties = {
  display: "inline-block",
  background: "#f8fafc",
  color: "#64748b",
  border: "1px solid #e5e7eb",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 900,
};

const activeBadge: CSSProperties = {
  display: "inline-block",
  background: "#ecfdf5",
  color: "#047857",
  border: "1px solid #a7f3d0",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 900,
};

const inactiveBadge: CSSProperties = {
  display: "inline-block",
  background: "#fee2e2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 900,
};

const smallBlueBtn: CSSProperties = {
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 10,
  padding: "0 10px",
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: appFont,
  width: 92,
  height: 34,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const smallDeleteMarkBtn: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#dc2626",
  fontSize: 20,
  fontWeight: 900,
  cursor: "pointer",
  lineHeight: "20px",
  fontFamily: appFont,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const emptyCell: CSSProperties = {
  padding: 28,
  textAlign: "center",
  color: "#64748b",
  fontWeight: 900,
  borderBottom: "1px solid #eef2f7",
};

const primaryBtn: CSSProperties = {
  border: 0,
  borderRadius: 12,
  background: "#2563eb",
  color: "white",
  padding: "12px 18px",
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: appFont,
};

const outlineBtn: CSSProperties = {
  border: "1px solid #2563eb",
  borderRadius: 12,
  background: "white",
  color: "#2563eb",
  padding: "12px 18px",
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: appFont,
};

const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
};

const modalBox: CSSProperties = {
  width: 980,
  maxWidth: "96vw",
  maxHeight: "92vh",
  overflowY: "auto",
  background: "white",
  borderRadius: 18,
  boxShadow: "0 25px 70px rgba(15,23,42,0.28)",
};

const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid #e5e7eb",
  padding: 18,
};

const modalCloseBtn: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "1px solid #d1d5db",
  background: "white",
  fontSize: 22,
  cursor: "pointer",
};

const modalBody: CSSProperties = {
  padding: 18,
  display: "grid",
  gap: 14,
};

const modalFooter: CSSProperties = {
  padding: 18,
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "flex-start",
  gap: 12,
};

const section: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  background: "#fafafa",
};

const sectionHeaderBtn: CSSProperties = {
  width: "100%",
  border: 0,
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 0,
  cursor: "pointer",
  fontFamily: appFont,
  fontSize: 18,
  fontWeight: 900,
  color: "#111827",
};

const sectionBody: CSSProperties = {
  marginTop: 14,
};

const grid3: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-3-cols, 1fr 1fr 1fr)",
  gap: 12,
};

const grid2: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 12,
};

const labelStyle: CSSProperties = {
  marginBottom: 6,
  color: "#374151",
  fontWeight: 800,
};

const input: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 15,
  fontFamily: appFont,
  boxSizing: "border-box",
};

const textarea: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 15,
  fontFamily: appFont,
  resize: "vertical",
  boxSizing: "border-box",
};

const typeShareholderRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginTop: 4,
};

const shareholderMiniBox: CSSProperties = {
  height: 46,
  minWidth: 130,
  border: "1px solid #dbeafe",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 12,
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const activeMiniBox: CSSProperties = {
  height: 46,
  minWidth: 95,
  border: "1px solid #dcfce7",
  background: "#f0fdf4",
  color: "#15803d",
  borderRadius: 12,
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};