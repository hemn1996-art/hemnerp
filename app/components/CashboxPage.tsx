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
          type: ["sales", "money_in", "shareholder_deposit"].includes(v.rawType) ? "in" : "out",
          amount: v.total,
          currencyId: v.currencyId || 1,
          note: v.internalNote,
          createdAt: v.date,
        });
      }
      if (v.fromCashboxId) {
        list.push({
          id: v.id,
          fromCashboxId: v.fromCashboxId,
          toCashboxId: v.toCashboxId,
          type: "transfer",
          amount: v.total,
          currencyId: v.currencyId || 1,
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
  const [statementCashbox, setStatementCashbox] = useState<CashboxLike | null>(null);

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
      return `${Number(amount || 0).toLocaleString("en-US")} دینار`;
    }
    return `${Number(amount || 0).toLocaleString("en-US")} ${symbol}`;
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
    const cashbox = cashboxesState.find((c: any) => c.id === id);
    if (cashbox) {
      setStatementCashbox(cashbox);
      setViewMode("statement");
    }
  }

  function closeStatement() {
    setViewMode("list");
    setStatementCashbox(null);
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