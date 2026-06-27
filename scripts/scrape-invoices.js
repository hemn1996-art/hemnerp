const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  console.log("دەستپێکردنی هێنانی پسوڵەکان بە بێدەنگی...");
  
  const browser = await puppeteer.launch({ 
    headless: true,
    executablePath: "C:\\Users\\ZETTA\\.cache\\puppeteer\\chrome\\win64-150.0.7871.24\\chrome-win64\\chrome.exe"
  });
  const page = await browser.newPage();
  
  // 1. Login
  console.log("لۆگین کردن...");
  await page.goto("https://londoncenter.genoiraq.com/login");
  await page.type("input[type='text'], input[name='email'], input[name='username']", "hemn");
  await page.type("input[type='password'], input[name='password']", "BnMoP@abc197");
  await page.click("button[type='submit']");
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  console.log("لۆگین سەرکەوتوو بوو.");

  // 2. Go to Invoices Report
  console.log("کردنەوەی لیستی هەموو پسوڵەکان...");
  await page.goto("https://londoncenter.genoiraq.com/report/invoice?startDate=2020-01-01&endDate=2030-01-01", { waitUntil: 'networkidle0' });

  // Extract all invoice IDs from the page (e.g. from table rows or links)
  // Let's grab all links that match /invoice/number
  const invoiceIds = await page.evaluate(() => {
    const ids = new Set();
    document.querySelectorAll("a").forEach(a => {
      const match = a.href.match(/\/invoice\/(\d+)$/);
      if (match) ids.add(match[1]);
    });
    // Also look at onclick handlers or any element with data-id if links aren't used
    // Let's also just try to find numbers in the first column of tables
    const tableRows = Array.from(document.querySelectorAll("tr"));
    tableRows.forEach(tr => {
      const td = tr.querySelector("td");
      if (td && !isNaN(parseInt(td.innerText.trim()))) {
        ids.add(td.innerText.trim());
      }
    });
    return Array.from(ids);
  });

  console.log(`دۆزرایەوە: ${invoiceIds.length} پسوڵە. ئێستا یەک یەک ڕایاندەکێشین...`);

  // If no IDs found by links or table rows, we might need a fallback.
  // We know user said 432 invoices. Let's just probe 1 to 500 if invoiceIds is empty.
  let idsToFetch = invoiceIds.length > 0 ? invoiceIds.map(Number).sort((a,b)=>a-b) : Array.from({length: 500}, (_, i) => i + 1);

  const invoicesData = [];
  
  for (const id of idsToFetch) {
    try {
      await page.goto(`https://londoncenter.genoiraq.com/invoice/${id}`, { waitUntil: 'networkidle0' });
      
      // Check if page actually loaded an invoice or redirected
      if (page.url().includes("/login") || page.url().includes("/dashboard") && !page.url().includes(`/invoice/${id}`)) {
        continue; // invalid ID or redirected
      }

      const invoiceDetail = await page.evaluate(() => {
        // This evaluates inside the browser context of the invoice page
        const tables = Array.from(document.querySelectorAll("table"));
        if (tables.length === 0) return null;

        // Try to get header info (Customer, Date, Total)
        // Usually these are in divs or standard labels
        const textContent = document.body.innerText;
        
        // Items are usually in a table. Let's extract all table rows.
        const items = [];
        tables.forEach(table => {
          const rows = table.querySelectorAll("tr");
          rows.forEach((row, i) => {
            if (i === 0) return; // skip header
            const cols = row.querySelectorAll("td, th");
            if (cols.length > 2) {
              items.push(Array.from(cols).map(c => c.innerText.trim()));
            }
          });
        });

        return {
          id: window.location.href.split("/").pop(),
          rawText: textContent.substring(0, 1000), // capture some raw text to parse customer/date later if needed
          items: items
        };
      });

      if (invoiceDetail && invoiceDetail.items.length > 0) {
        invoicesData.push(invoiceDetail);
        console.log(`- پسوڵەی ${id} ڕاکێشرا.`);
      }

    } catch (e) {
      console.error(`Error on invoice ${id}: ${e.message}`);
    }
  }

  const outPath = path.join(__dirname, "..", "scratch", "invoices_raw.json");
  fs.writeFileSync(outPath, JSON.stringify(invoicesData, null, 2));
  console.log(`✅ تەواو! داتاکان پاشەکەوت کران لە ${outPath}`);

  await browser.close();
})();
