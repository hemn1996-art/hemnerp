"use client";

import React, { CSSProperties, useEffect, useRef, useState } from "react";

type DateInputProps = {
  value: string; // expects YYYY-MM-DD
  onChange: (val: string) => void;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  placeholder?: string;
  label?: string | false; // optional label, defaults to "بەروار". Pass false or "" to hide.
};

const formatDateToDMY = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`; // DD.MM.YYYY
  }
  return dateStr;
};

export default function DateInput({
  value,
  onChange,
  disabled,
  style,
  className,
  placeholder,
  label = "بەروار",
}: DateInputProps) {
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    return parseLocalDate(value);
  });
  const [view, setView] = useState<"days" | "months" | "years">("days");
  const [yearPageStart, setYearPageStart] = useState(() => {
    const parsed = parseLocalDate(value);
    const yearVal = parsed.getFullYear();
    return yearVal - 5;
  });
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const parsed = parseLocalDate(value);
      setCurrentDate(parsed);
      setInputValue(formatDateToDMY(value));
    } else {
      setInputValue("");
    }
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      setView("days");
      const parsed = parseLocalDate(value);
      const yearVal = parsed.getFullYear();
      setYearPageStart(yearVal - 5);
      setCurrentDate(parsed);
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (view === "days") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (view === "years") {
      setYearPageStart(yearPageStart - 12);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (view === "days") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (view === "years") {
      setYearPageStart(yearPageStart + 12);
    }
  };

  const handleDayClick = (day: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const selectedDate = new Date(year, month, day);
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleMonthClick = (mIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, mIdx, 1));
    setView("days");
  };

  const handleYearClick = (yVal: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(yVal, month, 1));
    setView("months");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/[^0-9.]/g, "");

    if (val === "") {
      setInputValue("");
      onChange("");
      return;
    }

    const digits = val.replace(/\./g, "");
    let formatted = "";
    if (digits.length > 0) {
      formatted += digits.substring(0, 2);
    }
    if (digits.length > 2) {
      formatted += "." + digits.substring(2, 4);
    }
    if (digits.length > 4) {
      formatted += "." + digits.substring(4, 8);
    }

    setInputValue(formatted);

    if (formatted.length === 10) {
      const parts = formatted.split(".");
      const day = parseInt(parts[0], 10);
      const monthVal = parseInt(parts[1], 10) - 1;
      const yearVal = parseInt(parts[2], 10);

      const dateObj = new Date(yearVal, monthVal, day);
      if (
        dateObj.getFullYear() === yearVal &&
        dateObj.getMonth() === monthVal &&
        dateObj.getDate() === day
      ) {
        const yyyy = yearVal;
        const mm = String(monthVal + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        onChange(`${yyyy}-${mm}-${dd}`);
      }
    }
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }

  const parsedValue = value ? new Date(value) : null;
  const selectedDayNum = parsedValue && !isNaN(parsedValue.getTime()) ? parsedValue.getDate() : null;
  const selectedMonthNum = parsedValue && !isNaN(parsedValue.getTime()) ? parsedValue.getMonth() : null;
  const selectedYearNum = parsedValue && !isNaN(parsedValue.getTime()) ? parsedValue.getFullYear() : null;

  for (let d = 1; d <= daysInMonth; d++) {
    const isSelected =
      d === selectedDayNum && month === selectedMonthNum && year === selectedYearNum;
    days.push(
      <button
        key={`day-${d}`}
        type="button"
        onClick={(e) => handleDayClick(d, e)}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
          isSelected ? "bg-[#0b1f50] text-white shadow" : "hover:bg-slate-100 text-slate-700"
        }`}
      >
        {d}
      </button>
    );
  }

  const yearsGrid = [];
  for (let y = yearPageStart; y < yearPageStart + 12; y++) {
    const isSelected = y === selectedYearNum;
    yearsGrid.push(
      <button
        key={`year-${y}`}
        type="button"
        onClick={(e) => handleYearClick(y, e)}
        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          isSelected ? "bg-[#0b1f50] text-white" : "hover:bg-slate-100 text-slate-700"
        }`}
      >
        {y}
      </button>
    );
  }

  const monthsGrid = [];
  for (let m = 0; m < 12; m++) {
    const isSelected = m === selectedMonthNum && year === selectedYearNum;
    monthsGrid.push(
      <button
        key={`month-${m}`}
        type="button"
        onClick={(e) => handleMonthClick(m, e)}
        className={`px-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          isSelected ? "bg-[#0b1f50] text-white" : "hover:bg-slate-100 text-slate-700"
        }`}
      >
        مانگی {m + 1}
      </button>
    );
  }

  const containerStyle: CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "stretch",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    userSelect: "none",
    ...style,
    padding: 0, // padding: 0 so label and input stretch to edges
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onClick={() => {
        if (!disabled) setIsOpen(true);
      }}
      className={`shadow-sm transition-all select-none hover:border-[#0b1f50] ${
        disabled ? "opacity-60 bg-slate-50" : ""
      } ${className || ""}`}
    >
      {label && (
        <span
          style={{
            borderStartStartRadius: "11px",
            borderEndStartRadius: "11px",
          }}
          className="bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500 border-e border-slate-200 font-sans flex items-center justify-center whitespace-nowrap select-none"
        >
          {label}
        </span>
      )}
      <input
        type="text"
        disabled={disabled}
        className="px-3 py-2 text-sm text-slate-700 font-bold text-center w-full min-w-[120px] outline-none cursor-text font-sans bg-transparent"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder || "ڕڕ.مم.سسسس"}
        onClick={(e) => {
          e.stopPropagation(); // prevent closing/reopening on input click
          if (!disabled) setIsOpen(true);
        }}
      />

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-12 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 w-64 text-right select-none animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ top: "100%" }}
        >
          <div className="flex items-center justify-between mb-3 flex-row-reverse">
            {view === "days" || view === "years" ? (
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                ◀
              </button>
            ) : (
              <div className="w-6"></div>
            )}

            <div className="text-sm font-black text-slate-800 flex items-center gap-1.5 flex-row-reverse font-sans">
              {view === "days" && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setView("months");
                    }}
                    className="hover:text-[#0b1f50] hover:underline cursor-pointer"
                  >
                    مانگی {month + 1}
                  </button>
                  <span>-</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setYearPageStart(year - 5);
                      setView("years");
                    }}
                    className="hover:text-[#0b1f50] hover:underline cursor-pointer"
                  >
                    {year}
                  </button>
                </>
              )}
              {view === "months" && (
                <>
                  <span className="text-slate-800">هەڵبژاردنی مانگ</span>
                  <span>-</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setYearPageStart(year - 5);
                      setView("years");
                    }}
                    className="hover:text-[#0b1f50] hover:underline cursor-pointer"
                  >
                    {year}
                  </button>
                </>
              )}
              {view === "years" && (
                <span className="text-slate-800 text-[11px]">
                  هەڵبژاردنی ساڵ ({yearPageStart} - {yearPageStart + 11})
                </span>
              )}
            </div>

            {view === "days" || view === "years" ? (
              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                ▶
              </button>
            ) : (
              <div className="w-6"></div>
            )}
          </div>

          {view === "days" && (
            <>
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-[10px] mb-2 flex-row-reverse">
                <div>ی</div>
                <div>د</div>
                <div>س</div>
                <div>چ</div>
                <div>پ</div>
                <div>ه</div>
                <div>ش</div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center justify-items-center">
                {days}
              </div>
            </>
          )}

          {view === "months" && (
            <div className="grid grid-cols-3 gap-2 py-2 text-center">
              {monthsGrid}
            </div>
          )}

          {view === "years" && (
            <div className="grid grid-cols-3 gap-2 py-2 text-center">
              {yearsGrid}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
