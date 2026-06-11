"use client";

import { useRouter } from "next/navigation";
import Dashboard from "../components/Dashboard";

export default function DashboardPage() {
  const router = useRouter();

  const handleOpenInvoice = (type: string) => {
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
