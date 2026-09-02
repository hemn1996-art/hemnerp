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
      return <span className="text-slate-400 font-bold text-sm">0</span>;
    }

    return (
      <div className="flex flex-col gap-1.5 items-center justify-center">
        {activeBalances.map((b) => {
          const currency = getCurrency(b.currencyId);
          const symbol = currency?.symbol || "$";
          const amount = Number(b.amount || 0);
          const isNegative = amount < -0.01;
          const isIQD = currency?.code === "IQD" || currency?.name?.includes("دینار");

          return (
            <span
              key={b.currencyId}
              dir="ltr"
              className={`font-black text-sm px-3 py-1 rounded-lg border inline-flex items-center gap-1 ${
                isNegative
                  ? "text-red-700 bg-red-50 border-red-200"
                  : "text-slate-900 bg-slate-50 border-slate-200"
              }`}
            >
              <FormattedNumber 
                value={isNegative ? -amount : amount} 
                currencySymbol={isIQD ? "دینار" : symbol} 
              />
              {isNegative && <span className="mr-1 text-red-600 font-black">-</span>}
            </span>
          );
        })}
      </div>
    );
  }

  const filtered = cashboxesState.filter(
    (c: any) => (c.name || "").includes(search) || String(c.id || "") === search
  );

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm overflow-x-auto">
      <table className="w-full min-w-[1000px] border-collapse">
        <thead>
          <tr>
            <th className="bg-[#08265a] text-white border-b border-gray-200 p-4 text-center font-black rounded-tr-xl">
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
                colSpan={5}
                className="p-12 text-center text-gray-400 font-bold border-b border-gray-100"
              >
                <div className="flex flex-col items-center gap-3">
                  <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <span>هیچ قاسەیەک نەدۆزرایەوە.</span>
                </div>
              </td>
            </tr>
          ) : (
            filtered.map((cashbox: any) => {
              const hasNonZeroBalance = (cashbox.balances || []).some((b: any) => Math.abs(Number(b.amount || 0)) > 0.0001);
              const hasMovements = cashboxMovements.some(
                (m: any) => m.cashboxId === cashbox.id || m.fromCashboxId === cashbox.id || m.toCashboxId === cashbox.id
              );
              const hasData = hasNonZeroBalance || hasMovements;

              return (
                <tr
                  key={cashbox.id}
                  className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                >
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
                          className="w-8 h-8 rounded-full border border-red-200 bg-red-50 text-red-600 font-black flex items-center justify-center hover:bg-red-100 transition-colors cursor-pointer"
                          onClick={() => confirmDelete(cashbox.id)}
                          title="سڕینەوە"
                        >
                          ×
                        </button>
                      )}
                      <button
                        className="px-3.5 py-1.5 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-black flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer text-xs"
                        onClick={() => openStatement(cashbox.id)}
                      >
                        جوڵەکان
                      </button>
                      <button
                        className="px-3.5 py-1.5 h-8 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 font-black flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer text-xs"
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
