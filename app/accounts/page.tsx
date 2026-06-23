import AccountsPage from "../components/AccountsPage";
import { Suspense } from "react";

export default function AccountsRoute() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 text-lg">باردەکرێت...</div>}>
      <AccountsPage />
    </Suspense>
  );
}
