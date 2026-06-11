"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { store } from "../store/store";
import AlertModal from "./AlertModal";

type AccountLike = {
  id: number;
  name: string;
  accountTypeId?: number;
  country?: string;
  city?: string;
  district?: string;
  address?: string;
  isActive?: boolean;
  isShareholder?: boolean;
};

type AccountTypeLike = {
  id: number;
  name: string;
  isActive?: boolean;
};

type EmployeeLike = {
  id: number;
  name: string;
  phone?: string;
  isActive?: boolean;
};

type CollectionRow = {
  id: number;
  name: string;
  employeeId: number;
  country: string;
  city: string;
  district: string;
  accountTypeId: string;
  selectedAccountIds: number[];
  createdAt: string;
};

const fallbackEmployees: EmployeeLike[] = [
  { id: 1, name: "هێمن مەلا فەرهاد", phone: "07701403038", isActive: true },
  { id: 2, name: "کارمەندی A", phone: "", isActive: true },
];

export default function AccountCollectionPage() {
  const accounts = ((store as any).accounts || []) as AccountLike[];
  const accountTypes = ((store as any).accountTypes || []) as AccountTypeLike[];

  const employees =
    (((store as any).employees || []) as EmployeeLike[]).length > 0
      ? (((store as any).employees || []) as EmployeeLike[])
      : fallbackEmployees;

  if (!(store as any).accountCollections) {
    (store as any).accountCollections = [] as CollectionRow[];
  }

  const collections = (store as any).accountCollections as CollectionRow[];

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: "error" | "warning" | "success" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "warning", title: "", message: "" });

  const showAlert = (
    type: "error" | "warning" | "success" | "confirm",
    title: string,
    message: string,
    onConfirm?: () => void
  ) => setAlertConfig({ isOpen: true, type, title, message, onConfirm });

  const closeAlert = () => setAlertConfig((a: any) => ({ ...a, isOpen: false }));

  const [collectionName, setCollectionName] = useState("");
  const [employeeId, setEmployeeId] = useState<number>(employees[0]?.id || 0);

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [accountTypeId, setAccountTypeId] = useState("");

  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [manualTouched, setManualTouched] = useState(false);

  const countryOptions = useMemo(() => {
    return unique(accounts.map((a: any) => a.country).filter(Boolean) as string[]);
  }, [accounts]);

  const cityOptions = useMemo(() => {
    return unique(
      accounts
        .filter((a: any) => !country || a.country === country)
        .map((a: any) => a.city)
        .filter(Boolean) as string[]
    );
  }, [accounts, country]);

  const districtOptions = useMemo(() => {
    return unique(
      accounts
        .filter((a: any) => !country || a.country === country)
        .filter((a: any) => !city || a.city === city)
        .map((a: any) => a.district)
        .filter(Boolean) as string[]
    );
  }, [accounts, country, city]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account: any) => {
      if (account.isActive === false) return false;
      if (account.isShareholder) return false;

      if (country && account.country !== country) return false;
      if (city && account.city !== city) return false;
      if (district && account.district !== district) return false;

      if (
        accountTypeId &&
        Number(account.accountTypeId) !== Number(accountTypeId)
      ) {
        return false;
      }

      return true;
    });
  }, [accounts, country, city, district, accountTypeId]);

  useMemo(() => {
    if (!manualTouched) {
      setSelectedAccountIds(filteredAccounts.map((a: any) => a.id));
    }
  }, [filteredAccounts, manualTouched]);

  function unique(list: string[]) {
    return Array.from(new Set(list.filter(Boolean)));
  }

  function getAccountTypeName(id?: number) {
    if (!id) return "-";
    return accountTypes.find((t: any) => Number(t.id) === Number(id))?.name || "-";
  }

  function resetSelectionByFilters() {
    setSelectedAccountIds(filteredAccounts.map((a: any) => a.id));
    setManualTouched(false);
  }

  function toggleAccount(id: number) {
    setManualTouched(true);

    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x: any) => x !== id) : [...prev, id]
    );
  }

  function selectAllFiltered() {
    setManualTouched(true);
    setSelectedAccountIds(filteredAccounts.map((a: any) => a.id));
  }

  function unselectAll() {
    setManualTouched(true);
    setSelectedAccountIds([]);
  }

  function saveCollection() {
    if (!collectionName.trim()) {
      showAlert("warning", "ئاگاداری", "تکایە ناوی کۆلێکشن بنووسە.");
      return;
    }

    if (!employeeId) {
      showAlert("warning", "ئاگاداری", "تکایە کارمەند هەڵبژێرە.");
      return;
    }

    const row: CollectionRow = {
      id:
        collections.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0) +
        1,
      name: collectionName.trim(),
      employeeId,
      country,
      city,
      district,
      accountTypeId,
      selectedAccountIds,
      createdAt: new Date().toISOString(),
    };

    collections.push(row);

    showAlert("success", "سەرکەوتوو", "کۆلێکشن خەزن کرا ✅", () => {
      setCollectionName("");
      setCountry("");
      setCity("");
      setDistrict("");
      setAccountTypeId("");
      setSelectedAccountIds([]);
      setManualTouched(false);
    });
  }

  return (
    <div style={page}>
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
            <h1 style={title}>کۆلێکشن</h1>
            <p style={subtitle}>
              دیاریکردنی ئەو هەژمارانەی کارمەند دەتوانێت ببینێت و کاریان لەسەر بکات.
            </p>
          </div>
        </div>

        <button style={primaryBtn} onClick={saveCollection}>
          خەزنکردن
        </button>
      </div>

      <div style={card}>
        <h2 style={sectionTitle}>وردەکاری کۆلێکشن</h2>

        <div style={grid3}>
          <Field label="کارمەند">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(Number(e.target.value))}
              style={input}
            >
              {employees
                .filter((e) => e.isActive !== false)
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="ناوی کۆلێکشن">
            <input
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              style={input}
              placeholder="بۆ نموونە: هەژمارەکانی سلێمانی"
            />
          </Field>

          <Field label="جۆری هەژمار">
            <select
              value={accountTypeId}
              onChange={(e) => {
                setAccountTypeId(e.target.value);
                setManualTouched(false);
              }}
              style={input}
            >
              <option value="">هەموو جۆرەکان</option>
              {accountTypes
                .filter((type: any) => type.isActive !== false)
                .map((type: any) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>

        <div style={grid3}>
          <Field label="وڵات">
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCity("");
                setDistrict("");
                setManualTouched(false);
              }}
              style={input}
            >
              <option value="">هەموو وڵاتەکان</option>
              {countryOptions.map((item: any) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="شار">
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDistrict("");
                setManualTouched(false);
              }}
              style={input}
            >
              <option value="">هەموو شارەکان</option>
              {cityOptions.map((item: any) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="گەڕەک">
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setManualTouched(false);
              }}
              style={input}
            >
              <option value="">هەموو گەڕەکەکان</option>
              {districtOptions.map((item: any) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div style={statsGrid}>
        <div style={statBox}>
          <b>کۆی هەژماری فلتەرکراو</b>
          <span>{filteredAccounts.length.toLocaleString("en-US")}</span>
        </div>

        <div style={statBox}>
          <b>کۆی هەژماری هەڵبژێردراو</b>
          <span>{selectedAccountIds.length.toLocaleString("en-US")}</span>
        </div>
      </div>

      <div style={tableCard}>
        <div style={tableActions}>
          <button style={outlineBtn} onClick={resetSelectionByFilters}>
            گەڕاندنەوەی دیفۆڵت
          </button>

          <button style={outlineBtn} onClick={selectAllFiltered}>
            هەمووی هەڵبژێرە
          </button>

          <button style={dangerOutlineBtn} onClick={unselectAll}>
            هەمووی لابە
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>چالاکی</th>
                <th style={th}>ناو</th>
                <th style={th}>جۆر</th>
                <th style={th}>وڵات</th>
                <th style={th}>شار</th>
                <th style={th}>گەڕەک</th>
                <th style={th}>ناونیشان</th>
              </tr>
            </thead>

            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={emptyCell}>
                    هیچ هەژمارێک بەم فلتەرانە نەدۆزرایەوە.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account: any) => {
                  const checked = selectedAccountIds.includes(account.id);

                  return (
                    <tr key={account.id}>
                      <td style={tdCenter}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAccount(account.id)}
                        />
                      </td>

                      <td style={tdName}>{account.name}</td>
                      <td style={tdCenter}>{getAccountTypeName(account.accountTypeId)}</td>
                      <td style={tdCenter}>{account.country || "-"}</td>
                      <td style={tdCenter}>{account.city || "-"}</td>
                      <td style={tdCenter}>{account.district || "-"}</td>
                      <td style={tdCenter}>{account.address || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AlertModal {...alertConfig} onClose={closeAlert} />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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

const card: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
  marginBottom: 16,
};

const sectionTitle: CSSProperties = {
  margin: "0 0 14px",
  fontSize: 20,
  fontWeight: 900,
};

const grid3: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-3-cols, 1fr 1fr 1fr)",
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
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: appFont,
};

const dangerOutlineBtn: CSSProperties = {
  border: "1px solid #fecaca",
  borderRadius: 12,
  background: "#fff1f2",
  color: "#dc2626",
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: appFont,
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--grid-2-cols, 1fr 1fr)",
  gap: 12,
  marginBottom: 16,
};

const statBox: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: 900,
};

const tableCard: CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
};

const tableActions: CSSProperties = {
  display: "flex",
  gap: 10,
  marginBottom: 12,
  flexWrap: "wrap",
};

const table: CSSProperties = {
  width: "100%",
  minWidth: 900,
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
  fontWeight: 800,
};

const emptyCell: CSSProperties = {
  padding: 28,
  textAlign: "center",
  color: "#64748b",
  fontWeight: 900,
  borderBottom: "1px solid #eef2f7",
};