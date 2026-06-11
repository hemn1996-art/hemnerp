import { Suspense } from "react";
import ItemsPage from "../components/ItemsPage";

export default function MaterialsRoute() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-400">باردەکرێت... 🔄</div>}>
      <ItemsPage />
    </Suspense>
  );
}
