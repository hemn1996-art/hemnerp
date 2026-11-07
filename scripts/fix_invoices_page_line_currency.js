const fs = require('fs');

const path = 'c:/Users/ZETTA/OneDrive/Desktop/client-2-dwkan/app/reports/invoices/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

// Find line 2631 (0-indexed 2630)
let targetIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{voucher.lines.map((line, idx) => (') && lines[i+6] && lines[i+6].includes('{formatCurrencyValue(line.unitPrice')) {
    targetIdx = i;
    break;
  }
}

if (targetIdx !== -1) {
  console.log('Found at line:', targetIdx + 1);
  const newLines = [
    '                                          {voucher.lines.map((line, idx) => {',
    '                                            const lineCurId = line.currencyId || (Number(line.unitPrice) > 1000 ? 2 : (voucher.currencyId || 1));',
    '                                            return (',
    '                                              <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">',
    '                                                <td className="py-2.5 text-center font-bold text-slate-400">{idx + 1}</td>',
    '                                                <td className="py-2.5 text-right font-bold text-slate-800">{line.product?.name || "نەناسراو"}</td>',
    '                                                <td className="py-2.5 text-center text-slate-500 font-mono text-[11px]">{line.product?.code || "-"}</td>',
    '                                                <td className="py-2.5 text-center font-extrabold text-slate-800">{line.qty}</td>',
    '                                                <td className="py-2.5 text-center">{formatCurrencyValue(line.unitPrice, lineCurId)}</td>',
    '                                                <td className="py-2.5 text-center text-rose-500">{line.discountAmount > 0 ? formatCurrencyValue(line.discountAmount, lineCurId) : "-"}</td>',
    '                                                <td className="py-2.5 text-center font-black text-slate-900">{formatCurrencyValue(line.lineTotal, voucher.currencyId || 1)}</td>',
    '                                              </tr>',
    '                                            );',
    '                                          })}'
  ];
  lines.splice(targetIdx, 11, ...newLines);
  fs.writeFileSync(path, lines.join('\n'), 'utf8');
  console.log('Successfully replaced lines!');
} else {
  console.log('Could not find target index');
}
