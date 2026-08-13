/**
 * openPrintWindow
 * ─────────────────────────────────────────────────────────────────
 * Opens a fresh browser window containing ONLY the content of the
 * given print-area element, then triggers window.print() inside it.
 */
export function openPrintWindow(
  printAreaId: string,
  paperSize: "A4" | "A5" = "A4",
  extraBodyCss = ""
): void {
  const el = document.getElementById(printAreaId);
  if (!el) {
    window.print();
    return;
  }

  const html   = el.innerHTML;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isA5   = paperSize === "A5";

  const pw = window.open("", "_blank", "width=900,height=700");
  if (!pw) {
    window.print();   // fallback when popups are blocked
    return;
  }

  pw.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ckb">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: "Speda";
      src: url("${origin}/fonts/Speda.ttf") format("truetype");
      font-weight: 400;
    }
    @page {
      size: ${isA5 ? "A5 landscape" : "A4 portrait"};
      margin: 0;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      font-family: "Speda", "Segoe UI", Tahoma, Arial, sans-serif;
      direction: rtl;
      color: #000;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #__print_root {
      padding: ${isA5 ? "2mm 3mm" : "3mm 6mm"};
      width: 100%;
    }
    table {
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      box-sizing: border-box !important;
    }
    th {
      padding: ${isA5 ? "2px 2px" : "4px 3px"} !important;
      font-size: ${isA5 ? "8px" : "11px"} !important;
      line-height: 1.3;
      word-break: break-word;
      overflow-wrap: break-word;
      overflow: hidden;
      white-space: normal;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    td {
      padding: ${isA5 ? "1.5px 2px" : "4px 3px"} !important;
      font-size: ${isA5 ? "7.5px" : "10px"} !important;
      line-height: 1.3;
      word-break: break-word;
      overflow-wrap: break-word;
      overflow: hidden;
      white-space: normal;
    }
    tr { page-break-inside: avoid; break-inside: avoid; }
    button, input, select, textarea, .no-print { display: none !important; }
    ${extraBodyCss}
  </style>
</head>
<body>
  <div id="__print_root">${html}</div>
  <script>
    document.fonts.ready.then(function () {
      setTimeout(function () { window.print(); window.close(); }, 300);
    });
  </script>
</body>
</html>`);

  pw.document.close();
}
