import { useStore } from "../../store/store";
import { CashboxLike, CurrencyLike } from "./types";
import FormattedNumber from "../FormattedNumber";

type Props = {
  cashboxesState: CashboxLike[];
  search: string;
  formatAllBalances: (cashbox: CashboxLike) => string;
  handleEdit: (id: number) => void;
  confirmDelete: (id: number) => void;
  openStatement: (id: number) => void;
  cashboxMovements: any[];
};

export default function CashboxTable({
  cashboxesState,
  search,
  formatAllBalances,
  handleEdit,
  confirmDelete,
  openStatement,
  cashboxMovements,
}: Props) {
  const allCurrencies = useStore((state) => state.currencies) as CurrencyLike[];

  function getCurrency(currencyId: number) {
    return allCurrencies.find((c: any) => c.id === currencyId);
  }

  function renderBalances(cashbox: CashboxLike) {
    const activeBalances = (cashbox.balances || []).filter(
      (b) => Math.abs(Number(b.amount || 0)) > 0.0001
    );

    if (activeBalances.length === 0) {
      return <span style={{ color: "#9ca3af", fontWeight: 900 }}>0</span>;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        {activeBalances.map((b) => {
          const currency = getCurrency(b.currencyId);
          const symbol = currency?.symbol || "$";
          const amount = Number(b.amount || 0);
          const isNegative = amount < -0.01;
          return (
            <span
              key={b.currencyId}
              dir="ltr"
              style={{
                color: isNegative ? "#dc2626" : "#111827",
                fontWeight: 900,
                fontSize: 14,
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "6px",
                background: isNegative ? "rgba(220, 38, 38, 0.08)" : "transparent",
                border: isNegative ? "1px solid rgba(220, 38, 38, 0.15)" : "none",
              }}
            >
              <FormattedNumber 
                value={isNegative ? -amount : amount} 
                currencySymbol={currency?.code === "IQD" ? "دینار" : symbol} 
              />
              {isNegative && <span className="mr-1">-</span>}
            </span>
          );
        })}
      </div>
    );
  }
  const filtered = cashboxesState.filter(
    (c: any) => c.name.includes(search) || c.id.toString() === search
  );

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm overflow-x-auto">
      <table className="w-full min-w-[1000px] border-collapse">
        <thead>
          <tr>
            <th className="bg-[#08265a] text-white border-b border-gray-200 p-4 text-center font-black rounded-tr-xl">
              کۆد
            </th>
            <th className="bg-[#08265a] text-white border-b border-gray-200 p-4 text-center font-black">
              ناوی قاسە
            </th>
            <th className="bg-[#08265a] text-white border-b border-gray-200 p-4 text-center font-black">
              جۆر
            </th>
            <th className="bg-[#08265a] text-white border-b border-gray-200 p-4 text-center font-black">
              باڵانس
            </th>
            <th className="bg-[#08265a] text-white border-b border-gray-200 p-4 text-center font-black">
              دۆخ
            </th>
            <th className="bg-[#08265a] text-white border-b border-gray-200 p-4 text-center font-black rounded-tl-xl">
              کردارەکان
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="p-10 text-center text-gray-400 font-bold border-b border-gray-100"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl opacity-50">📭</span>
                  هیچ قاسەیەک نەدۆزرایەوە.
                </div>
              </td>
            </tr>
          ) : (
            filtered.map((cashbox: any) => {
              const hasNonZeroBalance = cashbox.balances.some((b: any) => Math.abs(b.amount) > 0.0001);
              const hasMovements = cashboxMovements.some(
                (m: any) => m.cashboxId === cashbox.id || m.fromCashboxId === cashbox.id || m.toCashboxId === cashbox.id
              );
              const hasData = hasNonZeroBalance || hasMovements;

              return (
                <tr
                  key={cashbox.id}
                  className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <td className="p-4 text-center text-gray-500 font-medium align-middle">
                    {cashbox.id}
                  </td>
                  <td className="p-4 text-right min-w-[220px] font-bold text-gray-800 align-middle">
                    {cashbox.name}
                  </td>
                  <td className="p-4 text-center align-middle">
                    {cashbox.type === "cash" ? (
                      <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-black">
                        کاش
                      </span>
                    ) : (
                      <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-xs font-black">
                        بانک
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center align-middle">
                    {renderBalances(cashbox)}
                  </td>
                  <td className="p-4 text-center align-middle">
                    {cashbox.isActive ? (
                      <span className="inline-block bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-xs font-black">
                        چالاک
                      </span>
                    ) : (
                      <span className="inline-block bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 text-xs font-black">
                        ناچالاک
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center align-middle">
                    <div className="flex items-center justify-center gap-2">
                      {!hasData && (
                        <button
                          className="w-8 h-8 rounded-full border border-red-200 bg-red-50 text-red-600 font-black flex items-center justify-center hover:bg-red-100 transition-colors"
                          onClick={() => confirmDelete(cashbox.id)}
                          title="سڕینەوە"
                        >
                          ×
                        </button>
                      )}
                      <button
                        className="px-3 py-1.5 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-black flex items-center justify-center hover:bg-blue-100 transition-colors"
                        onClick={() => openStatement(cashbox.id)}
                      >
                        جوڵەکان
                      </button>
                      <button
                        className="px-3 py-1.5 h-8 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 font-black flex items-center justify-center hover:bg-gray-100 transition-colors"
                        onClick={() => handleEdit(cashbox.id)}
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
  );
}
