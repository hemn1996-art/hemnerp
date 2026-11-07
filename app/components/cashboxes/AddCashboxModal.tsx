import { ReactNode } from "react";
import { CashboxForm, CashboxType, CurrencyLike } from "./types";

type Props = {
  editingId: number | null;
  form: CashboxForm;
  setForm: React.Dispatch<React.SetStateAction<CashboxForm>>;
  allCurrencies: CurrencyLike[];
  onlyDecimal: (value: string) => string;
  closeModal: () => void;
  handleSave: () => void;
};

export default function AddCashboxModal({
  editingId,
  form,
  setForm,
  allCurrencies,
  onlyDecimal,
  closeModal,
  handleSave,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center border-b border-gray-100 p-6 bg-gray-50/50">
          <h2 className="m-0 text-xl font-black text-gray-900">
            {editingId ? "گۆڕانکاری قاسە" : "زیادکردنی قاسە"}
          </h2>
          <button
            className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center justify-center text-lg"
            onClick={closeModal}
          >
            ×
          </button>
        </div>

        <div className="p-6 grid gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="ناوی قاسە">
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                placeholder="بۆ نموونە: قاسەی دوکان"
              />
            </Field>

            <Field label="جۆری قاسە">
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    type: event.target.value as CashboxType,
                  }))
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans bg-white"
              >
                <option value="cash">کاش</option>
                <option value="bank">بانک</option>
              </select>
            </Field>
          </div>

          {!editingId && (
            <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50/60 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm text-blue-900 leading-relaxed font-medium">
                <span className="font-bold block mb-1">باڵانسی سەرەتایی:</span>
                هەموو قاسەیەکی نوێ بە باڵانسی (٠) دروست دەبێت. بۆ دانانی سەرمایەی سەرەتایی یان تێکردنی پارە، تکایە لە بەشی <span className="font-bold underline">دانانی پارە</span> تۆماری بکە.
              </div>
            </div>
          )}

          <label className="inline-flex items-center gap-3 w-fit px-4 py-3 border border-green-200 bg-green-50 text-green-700 rounded-xl cursor-pointer hover:bg-green-100 transition-colors font-bold select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
              className="w-5 h-5 accent-green-600 cursor-pointer"
            />
            <span>چالاک</span>
          </label>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
          <button
            className="px-6 py-3 rounded-xl border border-blue-600 bg-white text-blue-600 font-bold hover:bg-blue-50 transition-colors"
            onClick={closeModal}
          >
            پاشگەزبوونەوە
          </button>
          <button
            className="px-6 py-3 rounded-xl border-none bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-sm"
            onClick={handleSave}
          >
            خەزنکردن
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-1">
      <div className="mb-2 text-gray-700 font-bold text-sm">{label}</div>
      {children}
    </label>
  );
}
