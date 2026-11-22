"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useStore } from "../store/store";

type SortField = "name" | "price" | null;
type SortDir = "asc" | "desc";

export default function SellingPricesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const products = useStore((s) => s.products);
  const currencies = useStore((s) => s.currencies);
  const priceTypesFromStore = (useStore((s: any) => s.priceTypes) || []) as any[];
  const fetchProducts = useStore((s) => s.fetchProducts);
  const fetchCurrencies = useStore((s) => s.fetchCurrencies);
  const fetchPriceTypes = useStore((s: any) => s.fetchPriceTypes);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchCurrencies();
      if (fetchPriceTypes) fetchPriceTypes();
    }
  }, [isOpen, fetchProducts, fetchCurrencies, fetchPriceTypes]);

  if (!isOpen) return null;

  // STRICTLY filter products: only active, non-expense products that have AVAILABLE STOCK (stock > 0)
  const activeProducts = products.filter((p: any) => {
    if (p.isActive === false || p.isExpense) return false;
    if (!p.isService && (p.stock || 0) <= 0) return false;
    return true;
  });

  const categories = Array.from(
    new Set(activeProducts.map((p: any) => p.category).filter(Boolean))
  ) as string[];

  const filteredProducts = activeProducts.filter((p: any) => {
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  /** Extract a comparable numeric price from a product (best/first sale price). */
  const getProductPriceValue = (product: any): number => {
    let priceList: any[] = [];
    if (Array.isArray(product.salePrices)) {
      priceList = product.salePrices;
    } else if (typeof product.salePrices === "string" && product.salePrices.trim()) {
      try { priceList = JSON.parse(product.salePrices); } catch { priceList = []; }
    }
    if (priceList.length > 0) {
      const best = priceList.find((sp: any) => Number(sp.amount || 0) > 0);
      return best ? Number(best.amount) : 0;
    }
    return product.salePrice ? Number(product.salePrice) : 0;
  };

  /** Sorted product list */
  const sortedProducts = useMemo(() => {
    if (!sortField) return filteredProducts;
    const list = [...filteredProducts];
    list.sort((a: any, b: any) => {
      if (sortField === "name") {
        const nameA = (a.name || "").localeCompare(b.name || "", "ar");
        return sortDir === "asc" ? nameA : -nameA;
      }
      // price
      const pa = getProductPriceValue(a);
      const pb = getProductPriceValue(b);
      return sortDir === "asc" ? pa - pb : pb - pa;
    });
    return list;
  }, [filteredProducts, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // Default: name → asc (A-Z), price → desc (high to low)
      setSortDir(field === "price" ? "desc" : "asc");
    }
  };

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 opacity-30 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M8 15l4 4 4-4" />
        </svg>
      );
    }
    return sortDir === "asc" ? (
      <svg className="w-3.5 h-3.5 text-amber-400 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5 text-amber-400 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getCurrencySymbol = (currencyId: number | string) => {
    const cur = currencies.find(
      (c: any) => c.id === Number(currencyId) || c.code === currencyId
    );
    if (!cur) return "$";
    if (cur.code === "IQD" || cur.name === "دینار" || cur.symbol === "دینار") {
      return "دینار";
    }
    return cur.symbol || cur.code || "$";
  };

  const renderPrices = (product: any) => {
    let priceList: any[] = [];

    if (Array.isArray(product.salePrices)) {
      priceList = product.salePrices;
    } else if (typeof product.salePrices === "string" && product.salePrices.trim()) {
      try {
        priceList = JSON.parse(product.salePrices);
      } catch {
        priceList = [];
      }
    }

    const defaultPriceTypeName = priceTypesFromStore[0]?.name || "نرخی تاک";
    const showPriceTypeLabel = priceTypesFromStore.length > 1;

    if (priceList && priceList.length > 0) {
      // If only 1 price type exists in system, strictly pick 1 best price to render
      if (!showPriceTypeLabel) {
        const bestPrice = priceList.find((sp: any) => Number(sp.amount || 0) > 0) || priceList[0];
        priceList = bestPrice ? [bestPrice] : [];
      } else {
        // Deduplicate by priceType
        const seen = new Set();
        priceList = priceList.filter((sp: any) => {
          const key = sp.priceType || "default";
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      return (
        <div className="flex flex-wrap gap-2 justify-start items-center">
          {priceList.map((sp: any, idx: number) => {
            const sym = getCurrencySymbol(sp.currencyId);
            const amt = Number(sp.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            let typeLabel = sp.priceType || sp.name || "";
            if (typeLabel === "جوملە" || !typeLabel) {
              typeLabel = defaultPriceTypeName;
            }
            const isIqd = sym === "دینار";

            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border shadow-sm ${
                  isIqd
                    ? "bg-purple-50 text-purple-900 border-purple-200"
                    : "bg-emerald-50 text-emerald-900 border-emerald-200"
                }`}
              >
                {showPriceTypeLabel && typeLabel && (
                  <span className="text-[11px] font-bold opacity-75 underline decoration-dotted">
                    {typeLabel}:
                  </span>
                )}
                <span>
                  {isIqd ? `${amt} ${sym}` : `${sym}${amt}`}
                </span>
              </span>
            );
          })}
        </div>
      );
    }

    if (product.salePrice) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-900 border border-emerald-200">
          $ {Number(product.salePrice).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </span>
      );
    }

    return (
      <span className="text-xs text-gray-400 font-bold italic">
        دیاری نەکراوە
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rtl text-right font-sans"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-xl">
              🏷️
            </div>
            <div>
              <h3 className="text-lg font-black text-amber-300 m-0">
                نرخی فرۆشتنی کاڵاکانی کۆگا
              </h3>
              <p className="text-xs text-indigo-200 m-0 mt-0.5 font-semibold">
                لیستی تەواوی کاڵاکان تەنها لەگەڵ نرخەکانی فرۆشتنیان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-white/10 text-amber-300 border border-white/20 text-xs font-black px-3 py-1.5 rounded-xl">
              کۆی کاڵاکان: {sortedProducts.length.toLocaleString("en-US")}
            </span>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center text-lg transition-colors cursor-pointer"
              title="داخستن"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <span className="absolute right-3 top-2.5 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="گەڕان بەدوای ناوی کاڵا ياخود کۆد..."
              className="w-full pr-9 pl-4 py-2 text-xs font-bold text-gray-800 bg-white rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs font-bold text-gray-700 bg-white rounded-xl border border-gray-300 outline-none cursor-pointer shadow-sm"
              >
                <option value="all">هەموو کاتێگۆرییەکان</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>🖨️</span>
              <span>چاپکردن</span>
            </button>
          </div>
        </div>

        {/* Product Prices Table */}
        <div className="p-4 overflow-y-auto flex-1 bg-white">
          {sortedProducts.length === 0 ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
              <span className="text-3xl">📦</span>
              <span className="text-sm font-bold text-gray-600">
                هیچ کاڵایەک نەدۆزرایەوە
              </span>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs font-black border-b border-slate-800">
                    <th className="p-3 w-12 text-center border-l border-slate-800">#</th>
                    <th
                      className="p-3 border-l border-slate-800 cursor-pointer select-none hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        <span>ناوی کاڵا</span>
                        <SortArrow field="name" />
                      </div>
                    </th>
                    <th className="p-3 w-32 border-l border-slate-800">کاتێگۆری</th>
                    <th
                      className="p-3 cursor-pointer select-none hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center gap-1">
                        <span>نرخی فرۆشتن</span>
                        <SortArrow field="price" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                  {sortedProducts.map((product: any, idx: number) => (
                    <tr
                      key={product.id || idx}
                      className="hover:bg-indigo-50/40 transition-colors"
                    >
                      <td className="p-3 text-center font-mono font-bold text-gray-400 border-l border-gray-100 bg-gray-50/50">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-extrabold text-gray-900 border-l border-gray-100">
                        <div className="flex items-center gap-2">
                          <span>{product.name}</span>
                          {product.code && (
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {product.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 border-l border-gray-100">
                        {product.category || "-"}
                      </td>
                      <td className="p-3 bg-gray-50/30">
                        {renderPrices(product)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center px-6">
          <span className="text-xs text-gray-500 font-semibold">
            کۆگای دۆستان — لیستی نرخەکان
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            داخستن
          </button>
        </div>
      </div>
    </div>
  );
}

