// Test save API with valid product
const payload = {
  type: "purchase",
  referenceNo: "TEST-001",
  date: new Date().toISOString(),
  accountId: 48, // کارگەکانی صین (supplier)
  cashboxId: null,
  currencyId: 7, // USD
  exchangeRate: 1500,
  totalAmount: 100,
  totalDiscount: 0,
  netAmount: 100,
  lines: [{
    productId: 34, // موبەریدی
    qty: 1,
    unitPrice: 100,
    discountPercent: 0,
    discountAmount: 0,
    lineTotal: 100,
    warehouseId: 5 // main warehouse
  }],
  expenses: [],
  paidAmounts: [],
  ledgerEntries: [{ currencyId: 7, debit: 0, credit: 100, exchangeRate: 1500 }]
};

fetch("https://project-amber-seven-47.vercel.app/api/vouchers", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
  .then(async (res) => {
    const body = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", body);
    
    // If created, clean up by deleting it
    if (res.status === 201) {
      const data = JSON.parse(body);
      console.log("Created voucher ID:", data.id);
      // Delete it
      const delRes = await fetch(`https://project-amber-seven-47.vercel.app/api/vouchers/${data.id}`, { method: "DELETE" });
      console.log("Delete status:", delRes.status);
    }
  })
  .catch((err) => console.error("Error:", err));
