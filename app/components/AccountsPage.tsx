"use client";
import FormattedNumberInput from "./FormattedNumberInput";
import { exportTableToExcel } from "../utils/excelExport";

import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { store, useStore } from "../store/store";
import AlertModal from "./AlertModal";
import { currencies as mockCurrencies } from "../data/mockData";

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
  shareholderBalance?: number;
  shareholderBalanceByCurrency?: Record<string, number>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type AccountForm = {
  name: string;
  accountTypeId: string;
  isShareholder: boolean;
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

import { useRouter } from "next/navigation";

export default function AccountsPage() {
  const router = useRouter();

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

  const activeAccountTypes = useMemo(() => {
    return accountTypes.filter((type: any) => type.isActive !== false);
  }, [accountTypes]);

  const [search, setSearch] = useState("");
  const [balanceSort, setBalanceSort] = useState<BalanceSort>("none");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("error");

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
    const q = search.trim().toLowerCase();

    const list = accountsState.filter((account: any) => {
      if (account.isShareholder === true) return false;
      const accountTypeName = account.isShareholder
        ? "خاوەن پشک"
        : getAccountTypeName(account.accountTypeId);

      const addressText = getAddressText(account);

      if (!q) return true;

      return (
        String(account.name || "").toLowerCase().includes(q) ||
        String(account.phone || "").toLowerCase().includes(q) ||
        String(accountTypeName || "").toLowerCase().includes(q) ||
        String(addressText || "").toLowerCase().includes(q)
      );
    });

    if (balanceSort === "desc") {
      return [...list].sort(
        (a, b) =>
          Math.abs(Number(b.balance || 0)) - Math.abs(Number(a.balance || 0))
      );
    }

    if (balanceSort === "asc") {
      return [...list].sort(
        (a, b) =>
          Math.abs(Number(a.balance || 0)) - Math.abs(Number(b.balance || 0))
      );
    }

    return list;
  }, [accountsState, search, accountTypes, balanceSort]);

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
    if (currencyId === 2) {
      return `${Math.abs(Number(value || 0)).toLocaleString("en-US")} دینار`;
    }
    return `${Math.abs(Number(value || 0)).toLocaleString("en-US")} ${symbol}`;
  }

  function getAddressText(account: AccountLike) {
    return account.address?.trim() || "-";
  }

  function formatNormalAccountBalance(account: AccountLike) {
    const map = account.balanceByCurrency || {};
    const entries = Object.entries(map)
      .filter(([, value]) => Math.abs(Number(value || 0)) > 0.0001);

    if (entries.length === 0) {
      return <span style={{ color: "#64748b", fontWeight: 955 }}>0</span>;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
        {entries.map(([currencyIdText, value]) => {
          const val = Number(value || 0);
          const curId = Number(currencyIdText);
          const color = val > 0 ? "#16a34a" : val < 0 ? "#dc2626" : "#64748b";
          return (
            <span key={currencyIdText} style={{ color, fontWeight: 950 }} dir="ltr">
              {val < 0 ? "-" : ""}{formatMoney(val, curId)}
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
        return <span style={{ color: "#2563eb", fontWeight: 950 }}>{formatMoney(account.shareholderBalance, 1)}</span>;
      }
      return <span style={{ color: "#64748b", fontWeight: 955 }}>0</span>;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
        {entries.map(([currencyIdText, value]) => {
          const val = Number(value || 0);
          const curId = Number(currencyIdText);
          return (
            <span key={currencyIdText} style={{ color: "#2563eb", fontWeight: 950 }} dir="ltr">
              {val < 0 ? "-" : ""}{formatMoney(val, curId)}
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
        isActive: form.isActive,
        creditLimit: toNumber(form.creditLimit),
        creditLimitCurrencyId: Number(form.creditLimitCurrencyId),
        debtAlertDays: toNumber(form.debtAlertDays),
        discountPercent: toNumber(form.discountPercent),
        guarantorName: form.guarantorName.trim() || undefined,
        notes: form.notes.trim() || undefined,
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
        isActive: form.isActive,
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
                <th style={th}>#</th>
                <th style={th}>ناو</th>
                <th style={th}>جۆری هەژمار</th>
                <th style={th}>ژمارە</th>
                <th style={th}>وڵات</th>
                <th style={th}>شار</th>
                <th style={th}>گەڕەک</th>
                <th style={th}>سنووری قەرزی تێپەراندووە</th>
                <th
                  style={{ ...th, cursor: "pointer", userSelect: "none" }}
                  onClick={toggleBalanceSort}
                  title="کلیک بکە بۆ ڕیزکردنی باڵانس"
                >
                  باڵانس{" "}
                  {balanceSort === "desc"
                    ? "↓"
                    : balanceSort === "asc"
                    ? "↑"
                    : ""}
                </th>
                <th style={th}>دۆخ</th>
                <th style={th}>چالاکی</th>
              </tr>
            </thead>

            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={12} style={emptyCell}>
                    هیچ هەژمارێک نەدۆزرایەوە.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account, index) => {
                  const balance = Number(account.balance || 0);
                  const creditLimit = Number(account.creditLimit || 0);
                  const overCreditLimit =
                    !account.isShareholder &&
                    creditLimit > 0 &&
                    Math.abs(balance) > creditLimit;

                  const canDelete = canDeleteAccount(account);

                  return (
                    <tr key={account.id}>
                      <td style={tdCenter}>{index + 1}</td>

                      <td style={tdName}>
                        <strong>{account.name}</strong>
                      </td>

                      <td style={tdCenter}>
                        {account.isShareholder
                          ? "خاوەن پشک"
                          : getAccountTypeName(account.accountTypeId)}
                      </td>

                      <td style={tdCenter}>{account.phone || "-"}</td>
                      <td style={tdCenter}>{account.country || "-"}</td>
                      <td style={tdCenter}>{account.city || "-"}</td>
                      <td style={tdCenter}>{account.district || "-"}</td>

                      <td style={tdCenter}>
                        {overCreditLimit ? (
                          <span style={yesBadge}>بەڵێ</span>
                        ) : (
                          <span style={noBadge}>نەخێر</span>
                        )}
                      </td>

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

                      <td style={tdCenter}>
                        {account.isActive !== false ? (
                          <span style={activeBadge}>چالاک</span>
                        ) : (
                          <span style={inactiveBadge}>ناچالاک</span>
                        )}
                      </td>

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
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          isShareholder: event.target.checked,
                          accountTypeId: event.target.checked
                            ? ""
                            : prev.accountTypeId,
                        }))
                      }
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