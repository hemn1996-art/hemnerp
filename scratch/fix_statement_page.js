const fs = require('fs');
const path = 'app/reports/account-statement/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state for visibleColumns and visibleColCount
const oldStateBlock = `  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [filterShowItems, setFilterShowItems] = useState("شاردنەوە");`;

const newStateBlock = `  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [filterShowItems, setFilterShowItems] = useState("شاردنەوە");
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    voucherId: true,
    type: true,
    totalAmount: true,
    discount: true,
    paidAmount: true,
    note: true,
    balance: true,
  });

  const visibleColCount = 1 +
    (visibleColumns.date ? 1 : 0) +
    (visibleColumns.voucherId ? 1 : 0) +
    (visibleColumns.type ? 1 : 0) +
    (visibleColumns.totalAmount ? 1 : 0) +
    (visibleColumns.discount ? 1 : 0) +
    (visibleColumns.paidAmount ? 1 : 0) +
    (visibleColumns.note ? 1 : 0) +
    (visibleColumns.balance ? 1 : 0);`;

// 2. Modify Table Headers
const oldHeaders = `            <thead className="bg-[#0b1f50] text-white">
              <tr>
                <th className="p-3 font-bold text-center border-x border-[#1a3680] w-10">#</th>
                <th className="p-3 font-bold text-center border-x border-[#1a3680]">بەروار</th>
                <th className="p-3 font-bold text-center border-x border-[#1a3680]">پسووڵە</th>
                <th className="p-3 font-bold text-center border-x border-[#1a3680]">جۆری پسووڵە</th>
                <th className="p-3 font-bold text-center border-x border-[#1a3680]">کۆی گشتی</th>
                <th className="p-3 font-bold text-center border-x border-[#1a3680]">داشکاندن</th>
                <th className="p-3 font-bold text-center border-x border-[#1a3680]">پارەی دراو</th>
                <th className="p-3 font-bold text-center border-x border-[#1a3680]">تێبینی</th>
                <th className="p-3 font-bold text-center border-x border-[#1a3680]">باڵانس</th>
              </tr>
            </thead>`;

const newHeaders = `            <thead className="bg-[#0b1f50] text-white">
              <tr>
                <th className="p-3 font-bold text-center border-x border-[#1a3680] w-10">#</th>
                {visibleColumns.date && <th className="p-3 font-bold text-center border-x border-[#1a3680]">بەروار</th>}
                {visibleColumns.voucherId && <th className="p-3 font-bold text-center border-x border-[#1a3680]">پسووڵە</th>}
                {visibleColumns.type && <th className="p-3 font-bold text-center border-x border-[#1a3680]">جۆری پسووڵە</th>}
                {visibleColumns.totalAmount && <th className="p-3 font-bold text-center border-x border-[#1a3680]">کۆی گشتی</th>}
                {visibleColumns.discount && <th className="p-3 font-bold text-center border-x border-[#1a3680]">داشکاندن</th>}
                {visibleColumns.paidAmount && <th className="p-3 font-bold text-center border-x border-[#1a3680]">پارەی دراو</th>}
                {visibleColumns.note && <th className="p-3 font-bold text-center border-x border-[#1a3680]">تێبینی</th>}
                {visibleColumns.balance && <th className="p-3 font-bold text-center border-x border-[#1a3680]">باڵانس</th>}
              </tr>
            </thead>`;

// 3. Modify Previous Balance Row
const oldPrevRow = `              {/* Previous Balance Row */}
              <tr className="border-b-2 border-[#0b1f50] bg-[#f0f4ff]">
                <td className="p-3 text-center text-gray-400">—</td>
                <td className="p-3 text-center text-gray-500 italic font-medium">پێشووتر ...</td>
                <td className="p-3 text-center text-gray-400">—</td>
                <td className="p-3 text-center text-gray-400">—</td>
                <td className="p-3 text-center text-gray-400">—</td>
                <td className="p-3 text-center text-gray-400">—</td>
                <td className="p-3 text-center text-gray-400">—</td>
                <td className="p-3 text-center text-gray-500 font-bold">نەبەستراو نەقدی</td>
                <td className="p-3 text-center font-black text-[#0b1f50]" dir="ltr">{renderBalances(processed.previousBalances)}</td>
              </tr>`;

const newPrevRow = `              {/* Previous Balance Row */}
              <tr className="border-b-2 border-[#0b1f50] bg-[#f0f4ff]">
                <td className="p-3 text-center text-gray-400">—</td>
                {visibleColumns.date && <td className="p-3 text-center text-gray-500 italic font-medium">پێشووتر ...</td>}
                {visibleColumns.voucherId && <td className="p-3 text-center text-gray-400">—</td>}
                {visibleColumns.type && <td className="p-3 text-center text-gray-400">—</td>}
                {visibleColumns.totalAmount && <td className="p-3 text-center text-gray-400">—</td>}
                {visibleColumns.discount && <td className="p-3 text-center text-gray-400">—</td>}
                {visibleColumns.paidAmount && <td className="p-3 text-center text-gray-400">—</td>}
                {visibleColumns.note && <td className="p-3 text-center text-gray-500 font-bold">نەبەستراو نەقدی</td>}
                {visibleColumns.balance && <td className="p-3 text-center font-black text-[#0b1f50]" dir="ltr">{renderBalances(processed.previousBalances)}</td>}
              </tr>`;

// 4. Modify Main Voucher Rows
const oldVoucherRowPrefix = `                      <tr
                        onClick={filterShowItems === "شاردنەوە" && hasLines ? () => toggleRow(v.id) : undefined}
                        className={\`border-b-0 border-t-2 border-gray-300 transition-colors \${filterShowItems === "شاردنەوە" && hasLines ? "cursor-pointer hover:brightness-95" : ""} \${tc.header}\`}
                      >
                        <td className="p-3 text-center text-gray-500 font-bold text-xs">{vIdx + 1}</td>
                        <td className="p-3 text-center text-gray-700 font-bold text-xs">{formatDate(v.date)}</td>
                        <td className="p-3 text-center">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(\`/invoices?editId=\${v.voucherId}&type=\${v.originalType || v.type}\`);
                            }}
                            className={\`font-black text-sm px-3 py-1 rounded-lg cursor-pointer hover:opacity-85 transition-opacity \${tc.badge}\`}
                          >
                            {v.voucherId}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-gray-800">
                          <span className="flex items-center justify-center gap-1">
                            {filterShowItems === "شاردنەوە" && hasLines && (
                              <span className="text-gray-400 text-xs">{isRowExpanded ? "▲" : "▼"}</span>
                            )}
                            {v.kurdishType}
                          </span>
                        </td>
                        <td className="p-3 text-center text-gray-800 font-black" dir="ltr">{formatMoney(v.totalAmount, v.currencyId || 1)}</td>
                        <td className="p-3 text-center text-red-500" dir="ltr">{v.totalDiscount > 0 ? formatMoney(v.totalDiscount, v.currencyId || 1) : "—"}</td>
                        <td className="p-3 text-center text-emerald-700 font-bold" dir="ltr">
                          {v.paidAmounts && v.paidAmounts.length > 0 ? (
                            <div className="flex flex-col gap-0.5 items-center justify-center">
                              {v.paidAmounts.map((pa: any, idx: number) => (
                                <span key={idx} dir="ltr">
                                  {formatMoney(pa.amount, pa.currencyId)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-center text-gray-500 text-xs">{v.note || "—"}</td>
                        <td className={\`p-3 text-center font-black text-sm \${tc.balanceBg}\`} dir="ltr">
                          {renderBalances(v.rowBalances)}
                        </td>
                      </tr>`;

const newVoucherRowPrefix = `                      <tr
                        onClick={filterShowItems === "شاردنەوە" && hasLines ? () => toggleRow(v.id) : undefined}
                        className={\`border-b-0 border-t-2 border-gray-300 transition-colors \${filterShowItems === "شاردنەوە" && hasLines ? "cursor-pointer hover:brightness-95" : ""} \${tc.header}\`}
                      >
                        <td className="p-3 text-center text-gray-500 font-bold text-xs">{vIdx + 1}</td>
                        {visibleColumns.date && <td className="p-3 text-center text-gray-700 font-bold text-xs">{formatDate(v.date)}</td>}
                        {visibleColumns.voucherId && (
                          <td className="p-3 text-center">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(\`/invoices?editId=\${v.voucherId}&type=\${v.originalType || v.type}\`);
                              }}
                              className={\`font-black text-sm px-3 py-1 rounded-lg cursor-pointer hover:opacity-85 transition-opacity \${tc.badge}\`}
                            >
                              {v.voucherId}
                            </span>
                          </td>
                        )}
                        {visibleColumns.type && (
                          <td className="p-3 text-center font-bold text-gray-800">
                            <span className="flex items-center justify-center gap-1">
                              {filterShowItems === "شاردنەوە" && hasLines && (
                                <span className="text-gray-400 text-xs">{isRowExpanded ? "▲" : "▼"}</span>
                              )}
                              {v.kurdishType}
                            </span>
                          </td>
                        )}
                        {visibleColumns.totalAmount && <td className="p-3 text-center text-gray-800 font-black" dir="ltr">{formatMoney(v.totalAmount, v.currencyId || 1)}</td>}
                        {visibleColumns.discount && <td className="p-3 text-center text-red-500" dir="ltr">{v.totalDiscount > 0 ? formatMoney(v.totalDiscount, v.currencyId || 1) : "—"}</td>}
                        {visibleColumns.paidAmount && (
                          <td className="p-3 text-center text-emerald-700 font-bold" dir="ltr">
                            {v.paidAmounts && v.paidAmounts.length > 0 ? (
                              <div className="flex flex-col gap-0.5 items-center justify-center">
                                {v.paidAmounts.map((pa: any, idx: number) => (
                                  <span key={idx} dir="ltr">
                                    {formatMoney(pa.amount, pa.currencyId)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                        {visibleColumns.note && <td className="p-3 text-center text-gray-500 text-xs">{v.note || "—"}</td>}
                        {visibleColumns.balance && (
                          <td className={\`p-3 text-center font-black text-sm \${tc.balanceBg}\`} dir="ltr">
                            {renderBalances(v.rowBalances)}
                          </td>
                        )}
                      </tr>`;

// 5. Modify Expanded Items Colspan
const oldColspanLine = `                      {/* === ITEM LINES (expanded) === */}
                      {isRowExpanded && hasLines && (
                        <tr className={\`border-b-2 border-gray-400 print:break-inside-avoid\`}>
                          <td colSpan={9} className={\`p-0 \${tc.itemBg}\`}>`;

const newColspanLine = `                      {/* === ITEM LINES (expanded) === */}
                      {isRowExpanded && hasLines && (
                        <tr className={\`border-b-2 border-gray-400 print:break-inside-avoid\`}>
                          <td colSpan={visibleColCount} className={\`p-0 \${tc.itemBg}\`}>`;

// 6. Modify Final Balance Row
const oldFinalBalanceRow = `              {/* Final Balance Row */}
              {!loading && processed.visibleItems.length > 0 && (
                <tr className="border-t-2 border-[#0b1f50] bg-[#0b1f50] text-white">
                  <td colSpan={8} className="p-3 text-right font-black text-base">باڵانسی کۆتایی</td>
                  <td className="p-3 text-center font-black text-xl" dir="ltr">{renderBalances(processed.finalBalances, true)}</td>
                </tr>
              )}`;

const newFinalBalanceRow = `              {/* Final Balance Row */}
              {!loading && processed.visibleItems.length > 0 && (
                <tr className="border-t-2 border-[#0b1f50] bg-[#0b1f50] text-white">
                  <td colSpan={visibleColCount - (visibleColumns.balance ? 1 : 0)} className="p-3 text-right font-black text-base">باڵانسی کۆتایی</td>
                  {visibleColumns.balance && (
                    <td className="p-3 text-center font-black text-xl" dir="ltr">{renderBalances(processed.finalBalances, true)}</td>
                  )}
                </tr>
              )}`;

// 7. Add Checkboxes to Modal
const oldModalCheckboxes = `              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">کەرەستە</label>
                <select 
                  value={filterShowItems} 
                  onChange={(e) => setFilterShowItems(e.target.value)} 
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium bg-gray-50 outline-none focus:border-[#0b1f50] text-gray-700"
                >
                  <option value="شاردنەوە">شاردنەوە</option>
                  <option value="پیشاندان">پیشاندان</option>
                </select>
              </div>`;

const newModalCheckboxes = `              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">کەرەستە</label>
                <select 
                  value={filterShowItems} 
                  onChange={(e) => setFilterShowItems(e.target.value)} 
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium bg-gray-50 outline-none focus:border-[#0b1f50] text-gray-700 animate-transition"
                >
                  <option value="شاردنەوە">شاردنەوە</option>
                  <option value="پیشاندان">پیشاندان</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">کۆڵۆمەکانی خشتە</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.date} onChange={() => setVisibleColumns(p => ({ ...p, date: !p.date }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    بەروار
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.voucherId} onChange={() => setVisibleColumns(p => ({ ...p, voucherId: !p.voucherId }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    پسووڵە
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.type} onChange={() => setVisibleColumns(p => ({ ...p, type: !p.type }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    جۆری پسووڵە
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.totalAmount} onChange={() => setVisibleColumns(p => ({ ...p, totalAmount: !p.totalAmount }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    کۆی گشتی
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.discount} onChange={() => setVisibleColumns(p => ({ ...p, discount: !p.discount }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    داشکاندن
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.paidAmount} onChange={() => setVisibleColumns(p => ({ ...p, paidAmount: !p.paidAmount }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    پارەی دراو
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.note} onChange={() => setVisibleColumns(p => ({ ...p, note: !p.note }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    تێبینی
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={visibleColumns.balance} onChange={() => setVisibleColumns(p => ({ ...p, balance: !p.balance }))} className="rounded text-[#0b1f50] focus:ring-[#0b1f50]" />
                    باڵانس
                  </label>
                </div>
              </div>`;

// Helper to perform normalized replacements (ignoring CRLF vs LF)
function replaceNormalized(target, replacement) {
  const normalizedTarget = target.replace(/\r\n/g, '\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');
  
  const index = normalizedContent.indexOf(normalizedTarget);
  if (index === -1) {
    console.error("Replacement target not found!");
    process.exit(1);
  }
  
  const prefix = normalizedContent.substring(0, index);
  const suffix = normalizedContent.substring(index + normalizedTarget.length);
  content = prefix + replacement.replace(/\r\n/g, '\n') + suffix;
}

replaceNormalized(oldStateBlock, newStateBlock);
replaceNormalized(oldHeaders, newHeaders);
replaceNormalized(oldPrevRow, newPrevRow);
replaceNormalized(oldVoucherRowPrefix, newVoucherRowPrefix);
replaceNormalized(oldColspanLine, newColspanLine);
replaceNormalized(oldFinalBalanceRow, newFinalBalanceRow);
replaceNormalized(oldModalCheckboxes, newModalCheckboxes);

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully updated account statement page with columns toggler!");
