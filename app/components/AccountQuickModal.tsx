"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface AccountQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: {
    id: number;
    name: string;
    code?: string;
  } | null;
  onViewDetails?: (accountId: number) => void;
}

export default function AccountQuickModal({
  isOpen,
  onClose,
  account,
  onViewDetails,
}: AccountQuickModalProps) {
  const router = useRouter();

  if (!isOpen || !account) return null;

  const handleStatementClick = () => {
    onClose();
    router.push(`/reports/account-statement?accountId=${account.id}`);
  };

  const handleVouchersClick = () => {
    onClose();
    router.push(`/reports/invoices?accountId=${account.id}`);
  };

  const handleDetailsClick = () => {
    onClose();
    if (onViewDetails) {
      onViewDetails(account.id);
    } else {
      router.push(`/accounts?search=${encodeURIComponent(account.name)}`);
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
            {account.name}
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

        {/* Action List */}
        <div className="p-2 space-y-1">
          {/* 1. Account Statement */}
          <button
            onClick={handleStatementClick}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-emerald-50/60 transition-colors group cursor-pointer text-right border border-transparent hover:border-emerald-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 border border-emerald-300 text-emerald-800 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                {/* Cash / Statement SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
              </div>
              <span className="text-xs font-bold text-gray-800 group-hover:text-emerald-950">
                بینینی کەشف حسابی هەژمار
              </span>
            </div>
            <span className="text-gray-400 group-hover:text-emerald-700 transition-transform group-hover:-translate-x-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
          </button>

          {/* 2. Voucher Report */}
          <button
            onClick={handleVouchersClick}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-purple-50/60 transition-colors group cursor-pointer text-right border border-transparent hover:border-purple-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100/80 border border-purple-300 text-purple-800 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                {/* Voucher SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <span className="text-xs font-bold text-gray-800 group-hover:text-purple-950">
                بینین لە ڕاپۆرتی پسووڵە
              </span>
            </div>
            <span className="text-gray-400 group-hover:text-purple-700 transition-transform group-hover:-translate-x-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
          </button>

          {/* 3. Account Details */}
          <button
            onClick={handleDetailsClick}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-blue-50/60 transition-colors group cursor-pointer text-right border border-transparent hover:border-blue-200"
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
                بینینی زانیاری هەژمار
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
