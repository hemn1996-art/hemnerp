"use client";

import { useEffect, useState, useMemo, CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "../store/store";
import FormattedNumberInput from "../components/FormattedNumberInput";
import AlertModal from "../components/AlertModal";

export default function CurrencyExchangePage() {
  const searchParams = useSearchParams();
  const urlEditId = searchParams.get("editId");
  const fetchCashboxes = useStore((s) => s.fetchCashboxes);
  const fetchCurrencies = useStore((s) => s.fetchCurrencies);
  const fetchInvoices = useStore((s) => s.fetchInvoices);
  const addVoucher = useStore((s) => s.addVoucher);
  const updateVoucher = useStore((s) => s.updateVoucher);

  const cashboxes = (useStore((s) => s.cashboxes) || []) as any[];
  const currencies = (useStore((s) => s.currencies) || []) as any[];
  const invoices = (useStore((s) => s.invoices) || []) as any[];

  useEffect(() => {
    fetchCashboxes();
    fetchCurrencies();
    fetchInvoices();
  }, [fetchCashboxes, fetchCurrencies, fetchInvoices]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, type: any, title: string, message: string, onConfirm?: () => void}>({isOpen: false, type: "warning", title: "", message: ""});
  const showAlert = (type: any, title: string, message: string, onConfirm?: () => void) => setAlertConfig({isOpen: true, type, title, message, onConfirm});
  const closeAlert = () => setAlertConfig(a => ({...a, isOpen: false}));
  
  const [cashboxId, setCashboxId] = useState("");
  const [rate, setRate] = useState("150000");

  useEffect(() => {
    if (!editId && currencies && currencies.length > 0) {
      const iqd = currencies.find((c: any) => c.code === "IQD" || c.name.includes("دینار"));
      if (iqd && iqd.rate) {
        setRate(String(iqd.rate * 100));
      }
    }
  }, [currencies, editId]);
  
  const iqdCurrency = currencies.find(c => c.code === "IQD" || c.name.includes("دینار"));
  const usdCurrency = currencies.find(c => c.code === "USD" || c.name.includes("دۆلار"));
  
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  // Direction: "USD_TO_IQD" or "IQD_TO_USD"
  const [direction, setDirection] = useState<"USD_TO_IQD" | "IQD_TO_USD">("USD_TO_IQD");
  
  const [note, setNote] = useState("");
  const [isNoteEdited, setIsNoteEdited] = useState(false);

  // Auto-generate note
  useEffect(() => {
    if (isNoteEdited) return;
    const a1 = parseFloat(fromAmount.replace(/,/g, '') || "0").toLocaleString(undefined, { maximumFractionDigits: 2 });
    const a2 = parseFloat(toAmount.replace(/,/g, '') || "0").toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (direction === "USD_TO_IQD") {
      setNote(`${a1} $ گۆڕدرا بۆ ${a2} دینار`);
    } else {
      setNote(`${a1} دینار گۆڕدرا بۆ ${a2} $`);
    }
  }, [fromAmount, toAmount, direction, isNoteEdited]);

  // Handle amount changes
  function handleFromChange(val: string) {
    setFromAmount(val);
    const num = parseFloat(val) || 0;
    const r = (parseFloat(rate) || 0) / 100;
    if (direction === "USD_TO_IQD") {
      setToAmount((num * r).toString());
    } else {
      setToAmount((num / r).toFixed(2));
    }
  }

  function handleToChange(val: string) {
    setToAmount(val);
    // User requested to be able to change the second amount manually 
    // without it affecting the first amount or the rate.
  }

  function handleRateChange(val: string) {
    setRate(val);
    const r = (parseFloat(val) || 0) / 100;
    const num = parseFloat(fromAmount) || 0;
    if (direction === "USD_TO_IQD") {
      setToAmount((num * r).toString());
    } else {
      setToAmount((num / r).toFixed(2));
    }
  }

  function toggleDirection() {
    setDirection(d => d === "USD_TO_IQD" ? "IQD_TO_USD" : "USD_TO_IQD");
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  }

  const selectedCashbox = useMemo(() => cashboxes.find(c => c.id.toString() === cashboxId), [cashboxes, cashboxId]);

  async function handleSave() {
    if (!cashboxId) return showAlert("warning", "ئاگاداری", "تکایە قاسە هەڵبژێرە");

    const numFrom = parseFloat(fromAmount.replace(/,/g, '')) || 0;
    const numTo = parseFloat(toAmount.replace(/,/g, '')) || 0;
    const numRate = parseFloat(rate.replace(/,/g, '')) || 1;

    if (numFrom <= 0 || numTo <= 0) return showAlert("warning", "ئاگاداری", "بڕی پارە نادروستە");

    // "from" currency drops, "to" currency increases
    const fromCurId = direction === "USD_TO_IQD" ? usdCurrency?.id : iqdCurrency?.id;
    const toCurId = direction === "USD_TO_IQD" ? iqdCurrency?.id : usdCurrency?.id;

    if (selectedCashbox && fromCurId) {
      const currentFromBal = selectedCashbox.balances.find((b: any) => b.currencyId === fromCurId)?.amount || 0;
      if (numFrom > currentFromBal) {
        const curSymbol = fromCurId === usdCurrency?.id ? "$" : "دینار";
        return showAlert("warning", "ئاگاداری", `باڵانسی پێویست لەم دراوەدا (${curSymbol}) لە قاسەکەدا نییە.`);
      }
    }

    if (!fromCurId || !toCurId) return showAlert("error", "هەڵە", "دراوەکان نەدۆزرانەوە");

    const payload = {
      type: "cashbox_exchange",
      cashboxId: Number(cashboxId),
      date: new Date().toISOString(),
      exchangeRate: (parseFloat(rate.replace(/,/g, '')) || 0) / 100,
      internalNote: note,
      paidAmounts: [
        { currencyId: fromCurId, amount: -Math.abs(parseFloat(fromAmount) || 0) }, // Negative = deduct
        { currencyId: toCurId, amount: Math.abs(parseFloat(toAmount) || 0) },      // Positive = add
      ]
    };

    setIsSubmitting(true);
    const res = editId ? await updateVoucher(editId, payload) : await addVoucher(payload);
    setIsSubmitting(false);

    if (res) {
      setSuccessMsg("بە سەرکەوتوویی خەزن کرا ✅");
      setTimeout(() => setSuccessMsg(""), 3000);
      closeForm();
    } else {
      showAlert("error", "هەڵە", "هەڵەیەک ڕوویدا لە کاتی خەزنکردن");
    }
  }

  function confirmDelete(id: number) {
    showAlert("confirm", "دڵنیایت لە سڕینەوە؟", "پاش سڕینەوە ئەم زانیارییە ناگەڕێتەوە، ئایا دەتەوێت بەردەوام بیت؟", () => executeDelete(id));
  }

  async function executeDelete(id: number) {
    closeAlert();
    try {
      const res = await fetch(`/api/vouchers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("بە سەرکەوتوویی سڕایەوە 🗑️");
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchInvoices();
        fetchCashboxes();
      } else {
        showAlert("error", "هەڵە", "هەڵەیەک ڕوویدا لە سڕینەوە");
      }
    } catch (e) {
      showAlert("error", "هەڵە", "هەڵەیەک ڕوویدا");
    }
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditId(null);
    setFromAmount("");
    setToAmount("");
    setIsNoteEdited(false);
    setCashboxId("");
    const iqd = currencies.find((c: any) => c.code === "IQD" || c.name.includes("دینار"));
    if (iqd && iqd.rate) {
      setRate(String(iqd.rate * 100));
    } else {
      setRate("150000");
    }
  }

  // Handle Edit Click
  function handleEditClick(row: any) {
    setEditId(row.id);
    setCashboxId(row.cashboxId?.toString() || "");
    setNote(row.note);
    setIsNoteEdited(true);
    setRate(row.exchangeRate ? (Number(row.exchangeRate) * 100).toString() : "150000");
    setFromAmount(row.rawFromAmount.toString());
    setToAmount(row.rawToAmount.toString());
    
    // If original deduction was USD, direction is USD_TO_IQD
    if (row.fromCurCode === "USD") {
      setDirection("USD_TO_IQD");
    } else {
      setDirection("IQD_TO_USD");
    }
    
    setIsFormOpen(true);
  }

  // Exchanges list
  const exchangesList = useMemo(() => {
    return invoices.filter(v => v.type === "cashbox_exchange").map(v => {
      // Find from/to from paidAmounts
      let fromAmount = 0, toAmount = 0, fromSym = "", toSym = "", fromCurCode = "";
      v.paidAmounts?.forEach((pa: any) => {
        const amt = Number(pa.amount);
        if (amt < 0) {
          fromAmount = Math.abs(amt);
          fromSym = pa.currency?.symbol || pa.currency?.name || "";
          fromCurCode = pa.currency?.code || "";
        } else if (amt > 0) {
          toAmount = amt;
          toSym = pa.currency?.symbol || pa.currency?.name || "";
        }
      });
      // Format Date: DD/MM/YYYY
      const d = new Date(v.date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const time = d.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' });
      const dateStr = `${day}/${month}/${year} ${time}`;

      return {
        id: v.id,
        date: dateStr,
        user: "بەڕێوەبەر", // Default user since auth isn't hooked up yet
        note: v.internalNote,
        rawFromAmount: fromAmount,
        rawToAmount: toAmount,
        fromCurCode,
        exchangeRate: v.exchangeRate,
        cashboxId: v.cashboxId,
        fromStr: fromAmount > 0 ? `${fromAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${fromSym}` : "0",
        toStr: toAmount > 0 ? `${toAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${toSym}` : "0",
        cashboxName: v.cashboxName || "",
      };
    });
  }, [invoices]);

  useEffect(() => {
    if (urlEditId && exchangesList && exchangesList.length > 0) {
      const match = exchangesList.find(e => e.id === Number(urlEditId));
      if (match) {
        handleEditClick(match);
      }
    }
  }, [urlEditId, exchangesList]);

  if (isFormOpen) {
    return (
      <div style={page}>
        <AlertModal {...alertConfig} onClose={closeAlert} />
        {successMsg && <div style={successAlert}>{successMsg}</div>}
        <div style={infoAlert}>ئەو فیلدانەی کە بە * نیشانە کراون داواکراون (بڕی پارە، ڕەیتی دراو، ناوی قاسە) کە بەبێ ئەمانە پسوڵەکە دروست نابێت.</div>
        
        <div style={formCard}>
          <div style={formHeader}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              {editId ? `نوێکردنەوەی گۆڕینەوەی پارە #${editId}` : "زیادکردنی گۆڕینەوەی پارە"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>ئاڵوگۆڕ لەنێوان دراوەکان لە قاسە</p>
          </div>

          <div style={formBody}>
            {/* Cashbox select */}
            <div style={fieldGroup}>
              <label style={label}>قاسە <span style={{ color: "red" }}>*</span></label>
              <select style={select} value={cashboxId} onChange={e => setCashboxId(e.target.value)}>
                <option value="">هەڵبژێرە...</option>
                {cashboxes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Balances Box */}
            {selectedCashbox && (
              <div style={balanceBox}>
                <div style={balanceTitle}>بالانس</div>
                <div style={balanceAmounts}>
                  {selectedCashbox.balances.map((b: any, idx: number) => {
                    const cInfo = currencies.find(c => c.id === b.currencyId);
                    return (
                      <div key={idx} style={balRow}>
                        <span style={balNum}>{b.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                        <span style={balCur}>{cInfo?.symbol || cInfo?.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rates */}
            <div style={fieldGroup}>
              <label style={label}>ڕەیتی ١٠٠ دۆلار بە دینار</label>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={rateField}>
                  <span style={rateLabel}>$100</span>
                  <input style={inputBase} value="100" readOnly disabled />
                </div>
                <div style={rateField}>
                  <span style={rateLabel}>دینار</span>
                  <FormattedNumberInput style={inputBase} value={rate} onChange={handleRateChange} />
                </div>
              </div>
            </div>

            {/* Amounts */}
            <div style={fieldGroup}>
              <label style={label}>بڕی پارە <span style={{ color: "red" }}>*</span></label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                
                <div style={amountWrap}>
                  <span style={curTag}>{direction === "USD_TO_IQD" ? "$" : "دینار"}</span>
                  <FormattedNumberInput style={inputBase} value={fromAmount} onChange={handleFromChange} />
                </div>
                
                <button onClick={toggleDirection} style={swapBtn} title="گۆڕینی ئاراستە">⇄</button>
                
                <div style={amountWrap}>
                  <span style={curTag}>{direction === "USD_TO_IQD" ? "دینار" : "$"}</span>
                  <FormattedNumberInput style={inputBase} value={toAmount} onChange={handleToChange} />
                </div>
                
              </div>
            </div>

            {/* Note */}
            <div style={fieldGroup}>
              <label style={label}>تێبینی</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: 12, color: "#64748b" }}>×</span>
                <input 
                  style={{ ...inputBase, paddingLeft: 30 }} 
                  value={note} 
                  onChange={e => { setNote(e.target.value); setIsNoteEdited(true); }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={formFooter}>
            <button style={btnCancel} onClick={closeForm}>پاشگەزبوونەوە</button>
            <button style={btnSave} onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "چاوەڕێ بە..." : (editId ? "نوێ کردنەوە 🔄" : "خەزنکردن 💾")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <AlertModal {...alertConfig} onClose={closeAlert} />
      {successMsg && <div style={successAlert}>{successMsg}</div>}
      
      {/* Header toolbar */}
      <div style={toolbar}>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("open-sidebar"))}
            className="sidebar-toggle-btn items-center justify-center w-10 h-10 bg-gradient-to-b from-[#061f5f] to-[#03133f] text-white rounded-xl shadow-sm border border-[#ffffff20] transition-transform hover:scale-105 cursor-pointer text-xl"
            title="گەورەکردنی سایدبار"
          >
            ☰
          </button>
          <button style={btnPrimary} onClick={() => setIsFormOpen(true)}>زیادکردن</button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, maxWidth: 400 }}>
          <input style={searchInput} placeholder="گەڕان..." />
        </div>
      </div>

      {/* Table */}
      <div style={tableCard}>
        <div style={tableHeader}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>خشتەی بینینی گۆڕینەوەی پارە</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>پسوڵە</th>
                <th style={th}>جۆر</th>
                <th style={th}>قاسە</th>
                <th style={th}>لە</th>
                <th style={th}>بۆ</th>
                <th style={th}>تێبینی</th>
                <th style={th}>بەروار</th>
                <th style={th}>چالاکی</th>
              </tr>
            </thead>
            <tbody>
              {exchangesList.length === 0 ? (
                <tr><td colSpan={8} style={tdEmpty}>هیچ داتایەک نییە</td></tr>
              ) : (
                exchangesList.map((row, idx) => (
                  <tr key={row.id}>
                    <td style={tdCenter}>
                      <span style={{...badgeBlue, cursor: "pointer"}} onClick={() => handleEditClick(row)} title="دەستکاریکردن">{row.id}</span>
                    </td>
                    <td style={tdCenter}>گۆڕینەوەی پارە</td>
                    <td style={tdCenter}>{row.cashboxName}</td>
                    <td style={tdCenter} dir="ltr">{row.fromStr}</td>
                    <td style={tdCenter} dir="ltr">{row.toStr}</td>
                    <td style={tdCenter}>{row.note}</td>
                    <td style={tdCenter}>
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>{row.user}</div>
                      <div>{row.date}</div>
                    </td>
                    <td style={tdCenter}>
                      <button style={btnDelete} onClick={() => confirmDelete(row.id)}>🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* --- STYLES --- */
const font = '"Speda","Segoe UI",Tahoma,Arial,sans-serif';

const page: CSSProperties = {
  direction: "rtl",
  fontFamily: font,
  padding: 24,
  background: "#f8fafc",
  minHeight: "100%",
  color: "#0f172a"
};

const toolbar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20
};

const btnPrimary: CSSProperties = {
  background: "#1d4ed8",
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: 8,
  fontWeight: 700,
  fontFamily: font,
  cursor: "pointer"
};

const searchInput: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontFamily: font,
  fontSize: 14,
  outline: "none"
};

const tableCard: CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  overflow: "hidden"
};

const tableHeader: CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "flex-end"
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 800
};

const th: CSSProperties = {
  background: "#0f172a",
  color: "#fff",
  padding: "12px",
  textAlign: "center",
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid #1e293b"
};

const tdCenter: CSSProperties = {
  padding: "12px",
  textAlign: "center",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 13
};

const tdEmpty: CSSProperties = {
  padding: 30,
  textAlign: "center",
  color: "#64748b"
};

const btnDelete: CSSProperties = {
  background: "none",
  border: "none",
  color: "#ef4444",
  cursor: "pointer",
  fontSize: 16
};

const badgeBlue: CSSProperties = {
  background: "#1d4ed8",
  color: "#fff",
  padding: "4px 12px",
  borderRadius: 4,
  fontWeight: 700
};

// Form styles
const infoAlert: CSSProperties = {
  background: "#eff6ff",
  color: "#1d4ed8",
  padding: "12px 16px",
  borderRadius: 8,
  marginBottom: 20,
  fontWeight: 700,
  textAlign: "center"
};

const successAlert: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  padding: "12px 16px",
  borderRadius: 8,
  marginBottom: 20,
  fontWeight: 700,
  textAlign: "center",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
};

const formCard: CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  maxWidth: 800,
  margin: "0 auto"
};

const formHeader: CSSProperties = {
  padding: "20px",
  textAlign: "center",
  borderBottom: "1px solid #e2e8f0"
};

const formBody: CSSProperties = {
  padding: "24px",
  display: "grid",
  gap: 20
};

const fieldGroup: CSSProperties = {
  display: "grid",
  gap: 8
};

const label: CSSProperties = {
  fontWeight: 700,
  fontSize: 13,
  color: "#475569"
};

const select: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontFamily: font,
  fontSize: 14,
  outline: "none",
  width: "100%",
  background: "#f8fafc"
};

const inputBase: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontFamily: font,
  fontSize: 14,
  outline: "none",
  width: "100%",
  boxSizing: "border-box"
};

const balanceBox: CSSProperties = {
  background: "#ecfdf5",
  border: "1px solid #10b981",
  borderRadius: 8,
  padding: "12px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const balanceTitle: CSSProperties = {
  color: "#059669",
  fontSize: 12,
  fontWeight: 700
};

const balanceAmounts: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 4
};

const balRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6
};

const balNum: CSSProperties = {
  fontWeight: 900,
  color: "#059669"
};

const balCur: CSSProperties = {
  fontSize: 12,
  color: "#059669",
  opacity: 0.8
};

const rateField: CSSProperties = {
  display: "flex",
  flex: 1,
  alignItems: "center",
  gap: 8
};

const rateLabel: CSSProperties = {
  width: 40,
  textAlign: "center",
  fontWeight: 700,
  color: "#64748b"
};

const amountWrap: CSSProperties = {
  display: "flex",
  flex: 1,
  alignItems: "center",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  overflow: "hidden"
};

const curTag: CSSProperties = {
  background: "#f1f5f9",
  padding: "10px 16px",
  borderLeft: "1px solid #cbd5e1",
  fontWeight: 700,
  color: "#475569"
};

const swapBtn: CSSProperties = {
  background: "none",
  border: "none",
  fontSize: 24,
  color: "#1d4ed8",
  cursor: "pointer",
  padding: "0 10px"
};

const formFooter: CSSProperties = {
  padding: "16px 24px",
  borderTop: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "flex-start",
  gap: 12
};

const btnSave: CSSProperties = {
  background: "#0f172a",
  color: "#fff",
  border: "none",
  padding: "10px 24px",
  borderRadius: 8,
  fontWeight: 700,
  fontFamily: font,
  cursor: "pointer",
  opacity: 1 // will be changed by disabled state automatically in standard HTML but we can rely on disabled attribute for styling or leave it
};

const btnCancel: CSSProperties = {
  background: "#fff",
  color: "#64748b",
  border: "1px solid #cbd5e1",
  padding: "10px 24px",
  borderRadius: 8,
  fontWeight: 700,
  fontFamily: font,
  cursor: "pointer"
};
