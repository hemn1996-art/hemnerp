"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface ProductQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  onFilterStock?: (productId: number) => void;
  onViewDetails?: (productId: number) => void;
}

export default function ProductQuickModal({
  isOpen,
  onClose,
  product,
  onFilterStock,
  onViewDetails,
}: ProductQuickModalProps) {
  const router = useRouter();

  if (!isOpen || !product) return null;

  const handleStockClick = () => {
    onClose();
    if (onFilterStock) {
      onFilterStock(product.id);
    } else {
      router.push(`/reports/stock?productId=${product.id}`);
    }
  };

  const handleMovementClick = () => {
    onClose();
    router.push(`/reports/material-movements?productId=${product.id}`);
  };

  const handleItemsReportClick = () => {
    onClose();
    router.push(`/reports/items?productId=${product.id}`);
  };

  const handleStockLevelsClick = () => {
    onClose();
    router.push(`/reports/stock-snapshot?productId=${product.id}`);
  };

  const handleDetailsClick = () => {
    onClose();
    if (onViewDetails) {
      onViewDetails(product.id);
    } else {
      router.push(`/materials?edit=${product.id}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-right rtl animate-in zoom-in-95 duration-150 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0b1f50] text-white px-5 py-3.5 flex items-center justify-between select-none">
          <h3 className="font-bold text-sm tracking-wide line-clamp-1 flex-1 pl-2">
            {product.name}
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Optional code / ID subtitle */}
        <div className="px-5 pt-3 pb-1 flex justify-between items-center text-xs text-gray-400 font-bold border-b border-gray-50">
          <span>کردارە خێراکان</span>
          {product.code ? (
            <span className="text-slate-600 font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
              کۆد: {product.code}
            </span>
          ) : (
            <span className="text-slate-500 font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
              ID: #{product.id}
            </span>
          )}
        </div>

        {/* Action List */}
        <div className="p-2 space-y-1">
          {/* 1. Stock Report */}
          <button
            onClick={handleStockClick}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-amber-50/60 transition-colors group cursor-pointer text-right border border-transparent hover:border-amber-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-800 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                {/* Box / Warehouse SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <span className="text-xs font-bold text-gray-800 group-hover:text-amber-950">
                بینین لە ڕاپۆرتی کۆگا
              </span>
            </div>
            <span className="text-gray-400 group-hover:text-amber-700 transition-transform group-hover:-translate-x-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
          </button>

          {/* 2. Material Movements */}
          <button
            onClick={handleMovementClick}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-orange-50/60 transition-colors group cursor-pointer text-right border border-transparent hover:border-orange-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100/80 border border-orange-300 text-orange-800 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                {/* Movement / Arrows SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </div>
              <span className="text-xs font-bold text-gray-800 group-hover:text-orange-950">
                بینین لە ڕاپۆرتی جووڵەی کەرەستە
              </span>
            </div>
            <span className="text-gray-400 group-hover:text-orange-700 transition-transform group-hover:-translate-x-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
          </button>

          {/* 3. Product List */}
          <button
            onClick={handleItemsReportClick}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-yellow-50/60 transition-colors group cursor-pointer text-right border border-transparent hover:border-yellow-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-100/80 border border-yellow-300 text-yellow-800 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                {/* List SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </div>
              <span className="text-xs font-bold text-gray-800 group-hover:text-yellow-950">
                بینین لە ڕاپۆرتی کەرەستە
              </span>
            </div>
            <span className="text-gray-400 group-hover:text-yellow-700 transition-transform group-hover:-translate-x-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
          </button>

          {/* 4. Stock Levels */}
          <button
            onClick={handleStockLevelsClick}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-orange-50/60 transition-colors group cursor-pointer text-right border border-transparent hover:border-orange-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100/80 border border-orange-300 text-orange-800 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                {/* Snapshot / Level SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <span className="text-xs font-bold text-gray-800 group-hover:text-orange-950">
                بینین لە ڕاپۆرتی ئاستی کۆگا
              </span>
            </div>
            <span className="text-gray-400 group-hover:text-orange-700 transition-transform group-hover:-translate-x-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
          </button>

          {/* 5. Product Details */}
          <button
            onClick={handleDetailsClick}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/60 transition-colors group cursor-pointer text-right border border-transparent hover:border-blue-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100/80 border border-blue-300 text-blue-800 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                {/* Info SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <span className="text-xs font-bold text-gray-800 group-hover:text-blue-950">
                بینینی زانیاری کەرەستە
              </span>
            </div>
            <span className="text-gray-400 group-hover:text-blue-700 transition-transform group-hover:-translate-x-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
