"use client";

import { useEffect, useState, useMemo, CSSProperties } from "react";
import { useStore } from "../store/store";
import FormattedNumberInput from "../components/FormattedNumberInput";
import AlertModal from "../components/AlertModal";

export default function CurrencyTransferPage() {
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

  const [fromCashboxId, setFromCashboxId] = useState("");
  const [toCashboxId, setToCashboxId] = useState("");
  
  const iqdCurrency = currencies.find(c => c.code === "IQD" || c.name.includes("دینار"));
  const usdCurrency = currencies.find(c => c.code === "USD" || c.name.includes("دۆلار"));
  
  const [iqdAmount, setIqdAmount] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  
  const [note, setNote] = useState("");
  const [isNoteEdited, setIsNoteEdited] = useState(false);

  const fromCashbox = useMemo(() => cashboxes.find(c => c.id.toString() === fromCashboxId), [cashboxes, fromCashboxId]);
  const toCashbox = useMemo(() => cashboxes.find(c => c.id.toString() === toCashboxId), [cashboxes, toCashboxId]);

  // Auto-generate note
  useEffect(() => {
    if (isNoteEdited) return;
    const fromName = fromCashbox?.name || "قاسە";
    const toName = toCashbox?.name || "قاسە";
    
    const parts = [];
    const numIqd = parseFloat(iqdAmount.replace(/,/g, ''));
    const numUsd = parseFloat(usdAmount.replace(/,/g, ''));

    if (numIqd > 0) parts.push(`${numIqd.toLocaleString(undefined, { maximumFractionDigits: 2 })} دینار`);
    if (numUsd > 0) parts.push(`${numUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} $`);
    
    if (parts.length === 0) {
      setNote(`0 لە ${fromName} گواسترایەوە بۆ ${toName}`);
    } else {
      setNote(`${parts.join(" و ")} لە ${fromName} گواسترایەوە بۆ ${toName}`);
    }
  }, [iqdAmount, usdAmount, fromCashbox, toCashbox, isNoteEdited]);

  async function handleSave() {
    if (!fromCashboxId || !toCashboxId) return showAlert("warning", "ئاگاداری", "تکایە قاسە هەڵبژێرە");
    if (fromCashboxId === toCashboxId) return showAlert("warning", "ئاگاداری", "ناتوانیت بۆ هەمان قاسە بیگوێزیتەوە");

    const numIqd = parseFloat(iqdAmount.replace(/,/g, '')) || 0;
    const numUsd = parseFloat(usdAmount.replace(/,/g, '')) || 0;

    if (numIqd <= 0 && numUsd <= 0) return showAlert("warning", "ئاگاداری", "بڕی پارە نادروستە");

    if (fromCashbox) {
      const fromIqdBal = fromCashbox.balances.find((b: any) => b.currencyId === iqdCurrency?.id)?.amount || 0;
      const fromUsdBal = fromCashbox.balances.find((b: any) => b.currencyId === usdCurrency?.id)?.amount || 0;
      if (numIqd > fromIqdBal) {
        return showAlert("warning", "ئاگاداری", "باڵانسی دینار لە قاسەی سەرچاوە بەشی ئەم گواستنەوەیە ناکات.");
      }
      if (numUsd > fromUsdBal) {
        return showAlert("warning", "ئاگاداری", "باڵانسی دۆلار لە قاسەی سەرچاوە بەشی ئەم گواستنەوەیە ناکات.");
      }
    }

    const paidAmounts = [];
    if (numIqd > 0 && iqdCurrency) paidAmounts.push({ currencyId: iqdCurrency.id, amount: numIqd });
    if (numUsd > 0 && usdCurrency) paidAmounts.push({ currencyId: usdCurrency.id, amount: numUsd });

    if (paidAmounts.length === 0) return showAlert("error", "هەڵە", "دراوەکان نەدۆزرانەوە");

    const payload = {
      type: "cashbox_transfer",
      fromCashboxId: Number(fromCashboxId),
      toCashboxId: Number(toCashboxId),
      date: new Date().toISOString(),
      exchangeRate: 1,
      internalNote: note,
      paidAmounts
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
    setIqdAmount("");
    setUsdAmount("");
    setIsNoteEdited(false);
    setFromCashboxId("");
    setToCashboxId("");
  }

  // Handle Edit Click
  function handleEditClick(row: any) {
    setEditId(row.id);
    setFromCashboxId(row.fromCashboxId?.toString() || "");
    setToCashboxId(row.toCashboxId?.toString() || "");
    setNote(row.note);
    setIsNoteEdited(true);
    
    setIqdAmount(row.rawIqdAmount.toString() || "");
    setUsdAmount(row.rawUsdAmount.toString() || "");
    
    setIsFormOpen(true);
  }

  // Transfers list
  const transfersList = useMemo(() => {
    return invoices.filter(v => v.type === "cashbox_transfer").map(v => {
      // Find amounts
      let iqdAm = 0, usdAm = 0;
      const amountsArr: string[] = [];
      v.paidAmounts?.forEach((pa: any) => {
        const amt = Number(pa.amount);
        if (amt > 0) { // Since transfer creates negative and positive matching pairs, just read positive
          const sym = pa.currency?.symbol || pa.currency?.name || "";
          amountsArr.push(`${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${sym}`);
          if (pa.currency?.code === "USD") usdAm = amt;
          if (pa.currency?.code === "IQD") iqdAm = amt;
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
        amountStr: amountsArr.join(" و "),
        fromStr: v.fromCashbox?.name || "",
        toStr: v.toCashbox?.name || "",
        fromCashboxId: v.fromCashboxId,
        toCashboxId: v.toCashboxId,
        rawIqdAmount: iqdAm || "",
        rawUsdAmount: usdAm || "",
      };
    });
  }, [invoices]);

  if (isFormOpen) {
    return (
      <div style={page}>
        <AlertModal {...alertConfig} onClose={closeAlert} />
        {successMsg && <div style={successAlert}>{successMsg}</div>}
        <div style={infoAlert}>ئەو فیلدانەی کە بە * نیشانە کراون داواکراون (بڕی پارە، ناوی قاسەکان) کە بەبێ ئەمانە پسوڵەکە دروست نابێت.</div>
        
        <div style={formCard}>
          <div style={formHeader}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              {editId ? `نوێکردنەوەی گواستنەوەی پارە #${editId}` : "زیادکردنی گواستنەوەی پارە"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>گواستنەوەی پارە لەنێوان قاسەکان</p>
          </div>

          <div style={formBody}>
            {/* FROM Cashbox */}
            <div style={fieldGroup}>
              <label style={label}>لە قاسەی <span style={{ color: "red" }}>*</span></label>
              <select style={select} value={fromCashboxId} onChange={e => setFromCashboxId(e.target.value)}>
                <option value="">هەڵبژێرە...</option>
                {cashboxes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* FROM Balances Box */}
            {fromCashbox && (
              <div style={balanceBox}>
                <div style={balanceTitle}>بالانس</div>
                <div style={balanceAmounts}>
                  {fromCashbox.balances.map((b: any, idx: number) => {
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

            {/* Amounts */}
            <div style={fieldGroup}>
              <label style={{ ...label, textAlign: "center", display: "block" }}>بڕی پارە <span style={{ color: "red" }}>*</span></label>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={amountWrap}>
                  <span style={curTag}>دینار</span>
                  <FormattedNumberInput style={inputBase} value={iqdAmount} onChange={setIqdAmount} />
                </div>
                <div style={amountWrap}>
                  <span style={curTag}>$</span>
                  <FormattedNumberInput style={inputBase} value={usdAmount} onChange={setUsdAmount} />
                </div>
              </div>
            </div>

            {/* TO Cashbox */}
            <div style={fieldGroup}>
              <label style={label}>بۆ قاسەی <span style={{ color: "red" }}>*</span></label>
              <select style={select} value={toCashboxId} onChange={e => setToCashboxId(e.target.value)}>
                <option value="">هەڵبژێرە...</option>
                {cashboxes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* TO Balances Box */}
            {toCashbox && (
              <div style={balanceBox}>
                <div style={balanceTitle}>بالانس</div>
                <div style={balanceAmounts}>
                  {toCashbox.balances.map((b: any, idx: number) => {
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

            {/* Note */}
            <div style={fieldGroup}>
              <label style={label}>تێبینی</label>
              <input 
                style={inputBase} 
                value={note} 
                onChange={e => { setNote(e.target.value); setIsNoteEdited(true); }}
              />
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
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>خشتەی بینینی گواستنەوەی پارە</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>پسوڵە</th>
                <th style={th}>جۆر</th>
                <th style={th}>لە</th>
                <th style={th}>بۆ</th>
                <th style={th}>بڕ</th>
                <th style={th}>تێبینی</th>
                <th style={th}>بەروار</th>
                <th style={th}>چالاکی</th>
              </tr>
            </thead>
            <tbody>
              {transfersList.length === 0 ? (
                <tr><td colSpan={8} style={tdEmpty}>هیچ داتایەک نییە</td></tr>
              ) : (
                transfersList.map((row, idx) => (
                  <tr key={row.id}>
                    <td style={tdCenter}>
                      <span style={{...badgeBlue, cursor: "pointer"}} onClick={() => handleEditClick(row)} title="دەستکاریکردن">{row.id}</span>
                    </td>
                    <td style={tdCenter}>گواستنەوەی پارە</td>
                    <td style={tdCenter}>{row.fromStr}</td>
                    <td style={tdCenter}>{row.toStr}</td>
                    <td style={tdCenter} dir="ltr">{row.amountStr}</td>
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
  color: "#475569",
  minWidth: 40,
  textAlign: "center"
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
  opacity: 1 // relying on disabled state
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
