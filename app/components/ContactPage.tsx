"use client";

import { useMemo } from "react";

// Lucide-style SVG Icons as react components (meeting rule: no emojis)
const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.387a12.035 12.035 0 01-7.108-7.108c-.145-.44.02-.927.387-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const MapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-pink-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25g15 0a7.5 7.5 0 10-15 0z" />
  </svg>
);

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-500 animate-pulse">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

export default function ContactPage() {
  // Floating mathematical particles (only mathematical operators and currency signs, no numbers)
  const particles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      symbol: ["+", "-", "×", "÷", "=", "∑", "%", "$", "IQD"][i % 9],
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 8}s`,
      size: `${12 + Math.random() * 20}px`
    }));
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 bg-slate-950 text-slate-100 flex flex-col justify-between rtl font-sans overflow-hidden relative">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_70%)] pointer-events-none" />

      {/* Floating mathematical animation layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute text-slate-700/30 select-none animate-float-up"
            style={{
              left: p.left,
              bottom: "-40px",
              fontSize: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          >
            {p.symbol}
          </span>
        ))}
      </div>

      {/* Embedded CSS for custom keyframes */}
      <style jsx global>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.4;
          }
          80% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-80vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: floatUp linear infinite;
        }
      `}</style>

      {/* Top Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6 z-10">
        <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl">
          <PhoneIcon />
        </div>
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            پەیوەندی کردن
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            زانیاری گەشەپێدەر و ئامارە گرافیکییە ژمێریارییەکان
          </p>
        </div>
      </div>

      {/* Main Grid: Left spans 5 columns, Right spans 7 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch z-10 flex-grow">
        {/* Left Column: Visual Charts (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-4 justify-between bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-md relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex-1 flex flex-col gap-4">
            {/* Chart 1: Revenue vs Expenses */}
            <div className="bg-slate-950/55 border border-slate-850/60 rounded-2xl p-4 flex flex-col justify-between flex-1">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-450">ئاراستەی گشتی چالاکی (Trend)</span>
                <div className="flex gap-2 text-[8px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> داهات
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> خەرجی
                  </span>
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                <svg viewBox="0 0 320 120" className="w-full h-full text-slate-400">
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="30" y1="15" x2="300" y2="15" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="30" y1="50" x2="300" y2="50" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="30" y1="85" x2="300" y2="85" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="30" y1="105" x2="300" y2="105" stroke="#475569" strokeWidth="1" />
                  
                  {/* Y Axis Labels (Only currency signs to avoid confusing with account numbers) */}
                  <text x="15" y="20" className="fill-slate-500 font-mono text-[8px]">$</text>
                  <text x="15" y="55" className="fill-slate-500 font-mono text-[8px]">$</text>
                  <text x="15" y="90" className="fill-slate-500 font-mono text-[8px]">$</text>
                  <text x="15" y="108" className="fill-slate-500 font-mono text-[8px]">$</text>

                  {/* X Axis Labels */}
                  <text x="45" y="116" className="fill-slate-450 text-[7px]">کانوون</text>
                  <text x="95" y="116" className="fill-slate-450 text-[7px]">شوبات</text>
                  <text x="145" y="116" className="fill-slate-450 text-[7px]">ئادار</text>
                  <text x="195" y="116" className="fill-slate-450 text-[7px]">نیسان</text>
                  <text x="245" y="116" className="fill-slate-450 text-[7px]">ئایار</text>
                  <text x="290" y="116" className="fill-slate-450 text-[7px]">حوزەیران</text>

                  {/* Revenue Line */}
                  <path d="M 45 90 Q 95 65 145 40 T 245 25 T 290 15" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M 45 90 Q 95 65 145 40 T 245 25 T 290 15 L 290 105 L 45 105 Z" fill="url(#revGrad)" />

                  {/* Expenses Line */}
                  <path d="M 45 98 Q 95 85 145 70 T 245 60 T 290 55" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Ticks */}
                  <circle cx="290" cy="15" r="3.5" fill="#10b981" />
                  <circle cx="290" cy="55" r="3.5" fill="#f43f5e" />
                </svg>
              </div>
            </div>

            {/* Chart 2: Financial Allocation (Doughnut) */}
            <div className="bg-slate-950/55 border border-slate-850/60 rounded-2xl p-4 flex flex-col justify-between flex-1">
              <span className="text-xs font-bold text-slate-450 mb-3 block">دابەشبوونی ڕێژەیی دارایی (Allocation)</span>
              
              <div className="flex-grow flex items-center justify-between gap-4">
                {/* SVG Doughnut */}
                <div className="w-24 h-24 relative flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    {/* Background circle */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="4" />
                    
                    {/* Capital section (60%) */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#6366f1" strokeWidth="4" 
                            strokeDasharray="60 40" strokeDashoffset="0" />
                    
                    {/* Profit section (25%) */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="4" 
                            strokeDasharray="25 75" strokeDashoffset="-60" />
                    
                    {/* Liabilities section (15%) */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f43f5e" strokeWidth="4" 
                            strokeDasharray="15 85" strokeDashoffset="-85" />
                  </svg>
                  {/* Inner text */}
                  <div className="absolute flex flex-col items-center">
                    <span className="text-base font-black text-slate-200">⚖️</span>
                    <span className="text-[7px] text-slate-500 font-bold uppercase">هاوسەنگ</span>
                  </div>
                </div>

                {/* Legends */}
                <div className="flex-1 flex flex-col gap-2 justify-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded bg-indigo-500" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-450">سەرمایە $</span>
                      <span className="text-[10px] font-bold text-slate-300 font-mono">60%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded bg-emerald-500" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-450">قازانج $</span>
                      <span className="text-[10px] font-bold text-slate-300 font-mono">25%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded bg-rose-500" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-450">قەرزەکان $</span>
                      <span className="text-[10px] font-bold text-slate-300 font-mono">15%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Details Card (col-span-7) */}
        <div className="lg:col-span-7 bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-slate-800/80 rounded-3xl p-7 backdrop-blur-md flex flex-col justify-between shadow-2xl relative">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-6">
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6">
              <div className="text-xs text-indigo-400 font-extrabold mb-1.5">زانیاری سەرەکی پرۆژە</div>
              <p className="text-sm lg:text-base leading-relaxed text-slate-300 font-medium">
                ئەم پڕۆژەیە بە دیزاینێکی پێشکەوتوو و کۆدە پپتەوکانی بەکارخراوە و جێبەجێ کراوە لە لایەن:
              </p>
              
              <div className="mt-4 flex items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-black text-white text-xl shadow-lg flex-shrink-0">
                  HF
                </div>
                <div>
                  <div className="text-xl lg:text-2xl font-black text-slate-100">هێمن فەرهاد حسێن</div>
                  <div className="text-xs lg:text-sm text-indigo-400 font-bold mt-1">ژمێریاری ئەزموونی و گەشەپێدەر</div>
                </div>
              </div>
            </div>

            {/* List details */}
            <div className="space-y-4">
              {/* Phone item */}
              <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-colors">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <PhoneIcon />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">ژمارەی پەیوەندی کردن</div>
                  <div className="text-sm lg:text-base font-black text-slate-200 font-mono tracking-wide mt-0.5">
                    ٠٧٧٠١٤٠٣٠٣٨ - ٠٧٥٠١٧٣٤٠٠٦
                  </div>
                </div>
              </div>

              {/* Email item */}
              <a 
                href="mailto:Hemn1996@gmail.com" 
                className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-colors no-underline block"
              >
                <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <EmailIcon />
                </div>
                <div className="flex-grow">
                  <div className="text-[10px] text-slate-500 font-bold">ناونیشانی ئیمەیڵ</div>
                  <div className="text-sm lg:text-base font-black text-slate-200 font-mono mt-0.5">
                    Hemn1996@gmail.com
                  </div>
                </div>
              </a>

              {/* Address item */}
              <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 hover:border-pink-500/40 transition-colors">
                <div className="p-2.5 bg-pink-500/10 rounded-xl border border-pink-500/20">
                  <MapIcon />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">ناونیشان</div>
                  <div className="text-sm lg:text-base font-black text-slate-200 mt-0.5">
                    سلێمانی
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex gap-4">
            <a
              href="tel:07701403038"
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-center shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm no-underline flex items-center justify-center gap-2"
            >
              📞 پەیوەندی تەلەفۆنی
            </a>
            <a
              href="mailto:Hemn1996@gmail.com"
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-xl text-center border border-slate-700 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm no-underline flex items-center justify-center gap-2"
            >
              ✉️ ناردنی ئیمەیڵ
            </a>
          </div>
        </div>
      </div>

      {/* Footer credits */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-650 mt-6 pt-4 border-t border-slate-900 z-10">
        <span>دروستکراوە بە</span>
        <HeartIcon />
        <span>بۆ بەڕێوەبردنی ژمێریاری کۆگا و دارایی</span>
      </div>
    </div>
  );
}
