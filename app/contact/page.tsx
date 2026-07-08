import ContactPage from "../components/ContactPage";
import { Suspense } from "react";

export default function ContactRoute() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 text-lg">باردەکرێت...</div>}>
      <ContactPage />
    </Suspense>
  );
}
