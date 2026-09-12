"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store/store";
import { CashboxForm, CashboxLike, CashboxBalance, CurrencyLike, CashboxType, MovementLike } from "./cashboxes/types";
import CashboxTable from "./cashboxes/CashboxTable";
import AddCashboxModal from "./cashboxes/AddCashboxModal";
import StatementModal from "./cashboxes/StatementModal";
import AlertModal from "./AlertModal";

type ToastType = "error" | "success" | "info";

export default function CashboxPage() {
  const allCurrencies = useStore((state) => state.currencies) as CurrencyLike[];

  // Using Zustand store for global cashboxes
  const cashboxesState = useStore((state) => state.cashboxes) || [];
  const addCashbox = useStore((state) => state.addCashbox);
  const updateCashbox = useStore((state) => state.updateCashbox);
  const deleteCashbox = useStore((state) => state.deleteCashbox);
  
  const fetchCurrencies = useStore((state) => state.fetchCurrencies);
  const fetchCashboxes = useStore((state) => state.fetchCashboxes);
  const fetchInvoices = useStore((state) => state.fetchInvoices);

  useEffect(() => {
    fetchCurrencies();
    fetchCashboxes();
    fetchInvoices();
  }, [fetchCurrencies, fetchCashboxes, fetchInvoices]);

  const vouchers = useStore((state) => state.invoices) || [];
  const cashboxMovements = useMemo(() => {
    const list: any[] = [];
    vouchers.forEach((v: any) => {
      if (v.cashboxId) {
        list.push({
          id: v.id,
          cashboxId: v.cashboxId,
          type: ["sales", "money_in", "shareholder_deposit", "purchase_return"].includes(v.rawType || v.type) ? "in" : "out",
          note: v.internalNote,
          createdAt: v.date,
        });
      }
      if (v.fromCashboxId || v.toCashboxId) {
        list.push({
          id: v.id,
          fromCashboxId: v.fromCashboxId,
          toCashboxId: v.toCashboxId,
          type: "transfer",
          note: v.internalNote,
          createdAt: v.date,
        });
      }
    });
    return list;
  }, [vouchers]);

  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("success");

  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "statement">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statementCashboxId, setStatementCashboxId] = useState<number | null>(null);

  const statementCashbox = useMemo(() => {
    if (!statementCashboxId) return null;
    return cashboxesState.find((c: any) => c.id === statementCashboxId) || null;
  }, [cashboxesState, statementCashboxId]);

  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, type: "error" | "warning" | "success" | "confirm", title: string, message: string, onConfirm?: () => void}>({isOpen: false, type: "warning", title: "", message: ""});
  const showAlert = (type: any, title: string, message: string, onConfirm?: () => void) => setAlertConfig({isOpen: true, type, title, message, onConfirm});
  const closeAlert = () => setAlertConfig(a => ({...a, isOpen: false}));

  const [form, setForm] = useState<CashboxForm>(() => ({
    name: "",
    type: "cash",
    isActive: true,
    balances: makeEmptyBalanceMap(allCurrencies),
  }));

  const filteredCashboxes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cashboxesState.filter((cashbox: any) => {
      if (!q) return true;
      return (
        String(cashbox.name || "").toLowerCase().includes(q) ||
        (cashbox.type === "bank" ? "بانک" : "کاش").includes(q) ||
        formatAllBalances(cashbox).toLowerCase().includes(q)
      );
    });
  }, [cashboxesState, search]);

  const usdCurrency = useMemo(() => {
    return allCurrencies.find((c: any) => c.code === "USD") || { id: 1, code: "USD", symbol: "$", rate: 1 };
  }, [allCurrencies]);

  const iqdCurrency = useMemo(() => {
    return allCurrencies.find((c: any) => c.code === "IQD") || { id: 2, code: "IQD", symbol: "دینار", rate: 1540 };
  }, [allCurrencies]);

  const dailyRate100 = useMemo(() => {
    const r = Number(iqdCurrency.rate || 1540);
    return r > 10000 ? r : r * 100;
  }, [iqdCurrency]);

  const ratePer1Usd = dailyRate100 / 100;

  const { totalIqd, totalUsd, netTotalUsd } = useMemo(() => {
    let iqdSum = 0;
    let usdSum = 0;

    cashboxesState.forEach((cb: any) => {
      if (cb.isActive === false) return;
      (cb.balances || []).forEach((b: any) => {
        const amt = Number(b.amount || 0);
        if (Number(b.currencyId) === Number(iqdCurrency.id) || b.currency?.code === "IQD") {
          iqdSum += amt;
        } else if (Number(b.currencyId) === Number(usdCurrency.id) || b.currency?.code === "USD") {
          usdSum += amt;
        }
      });
    });

    const convertedIqdToUsd = ratePer1Usd > 0 ? iqdSum / ratePer1Usd : 0;
    const netUsd = usdSum + convertedIqdToUsd;

    return {
      totalIqd: iqdSum,
      totalUsd: usdSum,
      netTotalUsd: netUsd,
    };
  }, [cashboxesState, iqdCurrency.id, usdCurrency.id, ratePer1Usd]);

  function makeEmptyBalanceMap(currencyList: CurrencyLike[]) {
    const map: Record<number, string> = {};
    currencyList.forEach((currency: any) => {
      if (currency.isActive !== false) {
        map[currency.id] = "0";
      }
    });
    return map;
  }

  function showToast(message: string, type: ToastType = "success") {
    setToastMessage(message);
    setToastType(type);
    window.setTimeout(() => {
      setToastMessage("");
    }, 3000);
  }

  function onlyDecimal(value: string) {
    const cleaned = value.replace(/[^\d.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot === -1) return cleaned;
    return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }

  function toNumber(value: string | number | undefined) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function getNextId() {
    return cashboxesState.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
  }

  function getCurrency(currencyId: number) {
    return allCurrencies.find((currency: any) => currency.id === currencyId);
  }

  function formatMoney(amount: number, currencyId: number) {
    const currency = getCurrency(currencyId);
    const symbol = currency?.symbol || "";

    if (currency?.code === "IQD") {
      return `${Math.round(Number(amount || 0)).toLocaleString("en-US")} دینار`;
    }
    return `${Math.round(Number(amount || 0)).toLocaleString("en-US")} ${symbol}`;
  }

  function formatAllBalances(cashbox: CashboxLike) {
    const parts = cashbox.balances
      .filter((balance) => Math.abs(Number(balance.amount || 0)) > 0.0001)
      .map((balance) => formatMoney(balance.amount, balance.currencyId));

    if (parts.length === 0) return "0";
    return parts.join(" + ");
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      type: "cash",
      isActive: true,
      balances: makeEmptyBalanceMap(allCurrencies),
    });
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(id: number) {
    const cashbox = cashboxesState.find((c: any) => c.id === id);
    if (!cashbox) return;

    const balanceMap = makeEmptyBalanceMap(allCurrencies);
    cashbox.balances.forEach((balance: any) => {
      balanceMap[balance.currencyId] = String(balance.amount ?? 0);
    });

    setEditingId(cashbox.id);
    setForm({
      name: cashbox.name || "",
      type: cashbox.type || "cash",
      isActive: cashbox.isActive !== false,
      balances: balanceMap,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    resetForm();
  }

  function validateForm() {
    const name = form.name.trim();
    if (!name) {
      showToast("تکایە ناوی قاسە بنووسە.", "error");
      return false;
    }

    const duplicated = cashboxesState.find((cashbox: any) => {
      return cashbox.id !== editingId && String(cashbox.name || "").trim().toLowerCase() === name.toLowerCase();
    });

    if (duplicated) {
      showToast("ئەم ناوی قاسەیە پێشتر هەیە.", "error");
      return false;
    }

    return true;
  }

  function handleSave() {
    if (!validateForm()) return;

    const now = new Date().toISOString();
    const oldCashbox = cashboxesState.find((item: any) => item.id === editingId);

    const balances: CashboxBalance[] = allCurrencies
      .filter((currency: any) => currency.isActive !== false)
      .map((currency: any) => ({
        currencyId: currency.id,
        amount: toNumber(form.balances[currency.id]),
      }));

    const data: CashboxLike = {
      id: editingId || getNextId(),
      name: form.name.trim(),
      type: form.type,
      isActive: form.isActive,
      balances,
      createdAt: oldCashbox?.createdAt || now,
      updatedAt: now,
    };

    if (editingId) {
      updateCashbox({
        id: editingId,
        name: form.name.trim(),
        type: form.type,
        isActive: form.isActive,
      }).then((res) => {
        if (res) {
          showToast("گۆڕانکارییەکان خەزنکران ✅", "success");
        } else {
          showToast("خەزنکردن سەرکەوتوو نەبوو ❌", "error");
        }
      });
    } else {
      addCashbox({
        name: form.name.trim(),
        type: form.type,
        isActive: form.isActive,
        balances,
      }).then((res) => {
        if (res) {
          showToast("قاسەی نوێ زیادکرا ✅", "success");
        } else {
          showToast("زیادکردن سەرکەوتوو نەبوو ❌", "error");
        }
      });
    }

    closeModal();
  }

  function confirmDelete(id: number) {
    const cashbox = cashboxesState.find((c: any) => c.id === id);
    if (!cashbox) return;

    // Optional check: if has balances or movements, do not delete
    const hasNonZeroBalance = cashbox.balances.some((b: any) => Math.abs(b.amount) > 0.0001);
    const hasMovements = cashboxMovements.some(
      (m: any) => m.cashboxId === id || m.fromCashboxId === id || m.toCashboxId === id
    );

    if (hasNonZeroBalance || hasMovements) {
      showToast("ناتوانیت ئەم قاسەیە بسڕیتەوە چونکە باڵانس یان جوڵەی هەیە ❌", "error");
      return;
    }

    showAlert("confirm", "دڵنیایت لە سڕینەوە؟", `ئایا دڵنیایت لە سڕینەوەی قاسەی "${cashbox.name}"؟`, () => {
      closeAlert();
      deleteCashbox(id).then((success) => {
        if (success) {
          showToast("قاسە سڕایەوە ✅", "success");
        } else {
          showToast("سڕینەوە سەرکەوتوو نەبوو ❌", "error");
        }
      });
    });
  }

  function openStatement(id: number) {
    setStatementCashboxId(id);
    setViewMode("statement");
  }

  function closeStatement() {
    setViewMode("list");
    setStatementCashboxId(null);
  }

  function getStatementRows(cashboxId: number) {
    return cashboxMovements
      .filter(
        (row: any) =>
          Number(row.cashboxId) === Number(cashboxId) ||
          Number(row.fromCashboxId) === Number(cashboxId) ||
          Number(row.toCashboxId) === Number(cashboxId)
      )
      .map((row: any, index: number) => ({
        id: row.id || index + 1,
        date: row.createdAt || row.date || "-",
        type: getMovementTypeText(row, cashboxId),
        amount: row.amount || 0,
        currencyId: row.currencyId || 1,
        note: row.note || "-",
      }));
  }

  function getMovementTypeText(row: any, cashboxId: number) {
    if (Number(row.fromCashboxId) === Number(cashboxId)) return "پارە ڕۆشتوو";
    if (Number(row.toCashboxId) === Number(cashboxId)) return "پارە هاتوو";
    if (row.type === "in") return "پارە هاتوو";
    if (row.type === "out") return "پارە ڕۆشتوو";
    if (row.type === "exchange") return "گۆڕینی پارە";
    if (row.type === "transfer") return "گواستنەوەی پارە";
    return "جوڵە";
  }

  if (viewMode === "statement" && statementCashbox) {
    return (
      <div className="p-6 rtl text-gray-900 font-sans min-h-screen pb-20">
        <AlertModal {...alertConfig} onClose={closeAlert} />
        {toastMessage && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 min-w-[360px] max-w-[80vw] px-6 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-3 shadow-2xl transition-all ${
              toastType === "success"
                ? "bg-green-600"
                : toastType === "error"
                ? "bg-red-600"
                : "bg-blue-600"
            }`}
          >
            <span>{toastMessage}</span>
            <button
              className="text-white hover:text-gray-200 transition-colors text-2xl"
              onClick={() => setToastMessage("")}
            >
              ×
            </button>
          </div>
        )}
        <StatementModal
          statementCashbox={statementCashbox}
          vouchers={vouchers}
          currencies={allCurrencies}
          closeStatement={closeStatement}
          isFullPage={true}
        />
      </div>
    );
  }

  return (
    <div className="p-6 rtl text-gray-900 font-sans min-h-screen pb-20">
      <AlertModal {...alertConfig} onClose={closeAlert} />
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 min-w-[360px] max-w-[80vw] px-6 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-3 shadow-2xl transition-all ${
            toastType === "success"
              ? "bg-green-600"
              : toastType === "error"
              ? "bg-red-600"
              : "bg-blue-600"
          }`}
        >
          <span>{toastMessage}</span>
          <button
            className="text-white hover:text-gray-200 transition-colors text-2xl"
            onClick={() => setToastMessage("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 flex justify-between items-center shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
              className="sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gradient-to-b from-[#061f5f] to-[#03133f] text-white rounded-xl shadow-sm border border-[#ffffff20] transition-transform hover:scale-105 cursor-pointer text-xl"
              title="گەورەکردنی سایدبار"
            >
              ☰
            </button>
            <h1 className="text-3xl font-black text-gray-900 m-0">قاسە</h1>
          </div>
          <p className="mt-2 text-gray-500 font-medium">بەڕێوەبردنی قاسەکان، بانک و کاش.</p>
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
          onClick={openAddModal}
        >
          <span className="text-xl">+</span> زیادکردن
        </button>
      </div>

      {/* Cash Summary Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Card 1: Total IQD */}
        <div className="bg-gradient-to-br from-white to-blue-50/40 border border-blue-100/80 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-blue-900/70">کۆی کاشی دینار (هەموو قاسەکان)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="12" x="2" y="6" rx="2"/>
                <circle cx="12" cy="12" r="2"/>
                <path d="M6 12h.01M18 12h.01"/>
              </svg>
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight" dir="ltr">
            <span>{Math.round(totalIqd).toLocaleString("en-US")}</span>{" "}
            <span className="text-base font-bold text-blue-700">دینار</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium flex items-center gap-1">
            <span>کۆی گشتی دیناری بەردەست لە هەموو قاسە و بانکەکان</span>
          </div>
        </div>

        {/* Card 2: Total USD */}
        <div className="bg-gradient-to-br from-white to-emerald-50/40 border border-emerald-100/80 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-emerald-900/70">کۆی کاشی دۆلار (هەموو قاسەکان)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="2" y2="22"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight" dir="ltr">
            <span className="text-base font-bold text-emerald-600 mr-1">$</span>
            <span>{Math.round(totalUsd).toLocaleString("en-US")}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium flex items-center gap-1">
            <span>کۆی گشتی دۆلاری نەقدی بەردەست</span>
          </div>
        </div>

        {/* Card 3: Net Cash Converted to USD Leaves (کۆی کاش بە گەڵای ڕۆژ) */}
        <div className="bg-gradient-to-br from-[#0b1b3d] to-[#040e24] text-white rounded-2xl p-5 shadow-lg relative overflow-hidden border border-blue-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-blue-200">کۆی کاش بە گەڵای ڕۆژ (صافی کاش)</span>
            <div className="w-9 h-9 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/>
                <path d="M7 3.34V5a3 3 0 0 0 3 3v0a2 2 0 0 1 2 2v0c0 1.1.9 2 2 2v0a2 2 0 0 0 2-2v0c0-1.1.9-2 2-2h3.17"/>
                <path d="M11 21.95V18a2 2 0 0 0-2-2v0a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight flex items-baseline gap-1" dir="ltr">
            <span className="text-lg font-bold text-emerald-300">$</span>
            <span>{Math.round(netTotalUsd).toLocaleString("en-US")}</span>
          </div>
          <div className="mt-2 text-xs text-blue-200/90 font-medium flex items-center justify-between border-t border-white/10 pt-2">
            <span>نرخی گەڵای ڕۆژ: 100$ = {Math.round(dailyRate100).toLocaleString("en-US")} دینار</span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md text-[11px] font-black">
              ≈ {Math.round(netTotalUsd / 100).toLocaleString("en-US")} گەڵا
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="گەڕان بە ناو، جۆر، باڵانس..."
          className="w-full md:w-[440px] px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
        />
        <div className="bg-blue-50 text-blue-700 border border-blue-200 px-5 py-2.5 rounded-full font-black text-sm">
          کۆی قاسە: {filteredCashboxes.length.toLocaleString("en-US")}
        </div>
      </div>

      <CashboxTable
        cashboxesState={filteredCashboxes}
        search={search}
        formatAllBalances={formatAllBalances}
        handleEdit={openEditModal}
        confirmDelete={confirmDelete}
        openStatement={openStatement}
        cashboxMovements={cashboxMovements}
      />

      {showModal && (
        <AddCashboxModal
          editingId={editingId}
          form={form}
          setForm={setForm}
          allCurrencies={allCurrencies}
          onlyDecimal={onlyDecimal}
          closeModal={closeModal}
          handleSave={handleSave}
        />
      )}


    </div>
  );
}