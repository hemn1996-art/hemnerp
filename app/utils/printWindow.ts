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
      size: ${isA5 ? "A5" : "A4"};
      margin: ${isA5 ? "3mm" : "5mm"};
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
      padding: ${isA5 ? "2mm 4mm" : "4mm 8mm"};
      width: 100%;
    }
    table {
      width: 100% !important;
      table-layout: auto !important;
      border-collapse: collapse !important;
      box-sizing: border-box !important;
    }
    th {
      padding: ${isA5 ? "6px 6px" : "7px 8px"} !important;
      font-size: ${isA5 ? "14px" : "15px"} !important;
      font-weight: 800 !important;
      line-height: 1.4;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    td {
      padding: ${isA5 ? "5px 6px" : "6px 8px"} !important;
      font-size: ${isA5 ? "14px" : "14.5px"} !important;
      line-height: 1.4;
      word-break: break-word;
      overflow-wrap: break-word;
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
