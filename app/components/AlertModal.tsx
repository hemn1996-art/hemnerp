import { ReactNode } from "react";

export type AlertType = "error" | "warning" | "success" | "confirm";

interface AlertModalProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string | ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function AlertModal({
  isOpen,
  type,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "بەڵێ",
  cancelText = "داخستن",
}: AlertModalProps) {
  if (!isOpen) return null;

  const isConfirm = type === "confirm";

  // Distinct premium colors and badges based on alert type
  let icon = "ℹ️";
  let iconBg = "bg-blue-50/80 text-blue-600 border-blue-100";
  let confirmBtnClass = "bg-blue-600 hover:bg-blue-750 text-white shadow-blue-500/10";

  if (type === "error") {
    icon = "❌";
    iconBg = "bg-red-50/80 text-red-650 border-red-150";
    confirmBtnClass = "bg-red-600 hover:bg-red-700 text-white shadow-red-500/10";
  } else if (type === "warning" || type === "confirm") {
    icon = "⚠️";
    iconBg = "bg-amber-50/80 text-amber-600 border-amber-150";
    confirmBtnClass = "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10";
  } else if (type === "success") {
    icon = "✅";
    iconBg = "bg-emerald-50/80 text-emerald-600 border-emerald-150";
    confirmBtnClass = "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10";
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[99999] p-4 transition-all duration-300">
      <div className="bg-white/95 border border-slate-100 rounded-3xl p-8 w-full max-w-md text-center shadow-2xl backdrop-blur-lg transform transition-all duration-300 scale-100 flex flex-col items-center">
        {/* Soft, beautiful circular icon badge */}
        <div
          className={`w-20 h-20 rounded-full border-2 ${iconBg} flex items-center justify-center text-4xl shadow-inner mb-5 transition-all duration-300`}
        >
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black text-slate-850 m-0 mb-3 font-sans leading-tight">
          {title}
        </h3>

        {/* Message */}
        <div className="text-slate-500 font-medium text-sm leading-relaxed mb-7 font-sans">
          {message}
        </div>

        {/* Actions Button Layout */}
        <div className="flex gap-3 justify-center w-full">
          {isConfirm && (
            <button
              className="flex-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-650 font-bold hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all font-sans text-sm cursor-pointer shadow-sm"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          <button
            className={`flex-1 px-5 py-3.5 rounded-xl border-none font-bold active:scale-95 transition-all font-sans text-sm cursor-pointer shadow-md ${confirmBtnClass}`}
            onClick={isConfirm && onConfirm ? onConfirm : onClose}
          >
            {isConfirm ? confirmText : cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
