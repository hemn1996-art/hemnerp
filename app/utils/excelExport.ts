import * as XLSX from "xlsx";

/**
 * Exports an HTML table to an Excel file with Right-to-Left (RTL) layout.
 * Automatically cleans up action columns, buttons, inputs, selects, and print-only helpers.
 * 
 * @param tableElementOrId HTMLTableElement or ID string of the table to export.
 * @param filename Name of the exported Excel file (defaults to "report.xlsx").
 */
export function exportTableToExcel(tableElementOrId: HTMLTableElement | string, filename: string = "report.xlsx") {
  if (typeof window === "undefined") return;

  let table: HTMLTableElement | null = null;
  if (typeof tableElementOrId === "string") {
    table = document.getElementById(tableElementOrId) as HTMLTableElement;
  } else {
    table = tableElementOrId;
  }

  if (!table) {
    console.error("Table element not found");
    return;
  }

  // Clone the table to avoid modifying the live DOM
  const clonedTable = table.cloneNode(true) as HTMLTableElement;

  // 1. Remove rows that contain nested tables (e.g., expanded voucher details in Account Statement)
  clonedTable.querySelectorAll("tr").forEach(tr => {
    if (tr.querySelector("table")) {
      tr.remove();
    }
  });

  // 2. Identify column indices that should be removed (headers with .no-print class or action headers)
  const firstRow = clonedTable.querySelector("tr");
  const headers = firstRow ? Array.from(firstRow.cells) : [];
  const indicesToRemove: number[] = [];

  headers.forEach((header, index) => {
    const text = header.textContent?.trim() || "";
    if (
      header.classList.contains("no-print") ||
      text === "چالاکی" ||
      text === "کردار" ||
      text === "Action" ||
      text === "Actions" ||
      text === "زیاتر ⚙️"
    ) {
      indicesToRemove.push(index);
    }
  });

  // 3. Remove identified columns from all rows in descending order to prevent shift issues
  indicesToRemove.sort((a, b) => b - a);
  const allRows = Array.from(clonedTable.querySelectorAll("tr"));
  allRows.forEach(row => {
    indicesToRemove.forEach(index => {
      if (row.cells && row.cells[index]) {
        row.deleteCell(index);
      }
    });
  });

  // 4. Clean up any remaining .no-print elements inside the table
  clonedTable.querySelectorAll(".no-print").forEach(el => el.remove());

  // 5. Replace form elements with their text/values
  clonedTable.querySelectorAll("input").forEach(input => {
    const parent = input.parentElement;
    if (parent) {
      parent.textContent = input.value;
    }
  });

  clonedTable.querySelectorAll("select").forEach(select => {
    const parent = select.parentElement;
    if (parent) {
      const selectedOption = select.options[select.selectedIndex];
      parent.textContent = selectedOption ? selectedOption.text : "";
    }
  });

  // 6. Remove remaining buttons
  clonedTable.querySelectorAll("button").forEach(btn => btn.remove());

  // Convert the cleaned cloned HTML table to a sheet
  const worksheet = XLSX.utils.table_to_sheet(clonedTable, { raw: false });

  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rapor");

  // Force Right-to-Left (RTL) layout
  const wb = workbook as any;
  if (!wb.Views) {
    wb.Views = [{}];
  }
  if (wb.Views[0]) {
    wb.Views[0].RTL = true;
  }

  // Trigger file download
  XLSX.writeFile(workbook, filename);
}
