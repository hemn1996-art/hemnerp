"use client";

import { useRouter } from "next/navigation";
import Dashboard from "../components/Dashboard";
import { useStore } from "../store/store";

export default function DashboardPage() {
  const router = useRouter();
  const hasPermission = useStore((s) => s.hasPermission);

  const handleOpenInvoice = (type: string) => {
    if (!hasPermission("vouchers", "canView")) {
      alert("ئاگاداری: تۆ دەسەڵاتی بینینی بەشی پسووڵەکانت نییە!");
      return;
    }

    let typeParam = "";
    if (type === "فرۆشتن") typeParam = "sales";
    else if (type === "کڕین") typeParam = "purchase";
    else if (type === "پارەی هاتوو") typeParam = "money_in";
    else if (type === "پارەی ڕۆشتوو") typeParam = "money_out";
    else if (type === "خەرجی") typeParam = "expense";
    
    if (typeParam) {
      router.push(`/invoices?type=${typeParam}`);
    }
  };

  return <Dashboard openInvoice={handleOpenInvoice} />;
}
