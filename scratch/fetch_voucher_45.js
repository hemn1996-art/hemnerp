async function main() {
  const res = await fetch("http://localhost:3000/api/vouchers/45");
  if (!res.ok) {
    console.error("Failed to fetch", res.status, await res.text());
    return;
  }
  const data = await res.json();
  console.log("Voucher 45 from server:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
