"use client";

import { useEffect, useState, useMemo } from "react";

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

const CodeSnippets = [
  `// ژمێرینی هاوسەنگی دەفتەری گشتی\nconst balance = await prisma.ledgerEntry.groupBy({\n  by: ['accountId', 'currencyId'],\n  _sum: { debit: true, credit: true }\n});`,
  `// دڵنیابوونەوە لە هاوسەنگی باڵانس\nlet assets = debitSum;\nlet liabilities = creditSum + equity;\nif (assets === liabilities) {\n  console.log("سیستەمەکە هاوسەنگە! ⚖️");\n}`,
  `// خولی دابەشکردنی قازانج\nconst profit = revenue - expenses;\nshareholders.forEach(partner => {\n  const share = profit * partner.percentage;\n  pay(partner.id, share);\n});`,
  `// داگرتنی ڕاپۆرتی دارایی\nconst generateBalanceSheet = (asOfDate) => {\n  return executeConsolidatedReport(asOfDate);\n};`
];

export default function ContactPage() {
  // Code typewriter effect states
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Accounting numbers states
  const [debitCount, setDebitCount] = useState(0);
  const [creditCount, setCreditCount] = useState(0);
  const [isBalancing, setIsBalancing] = useState(true);

  // Generate code writing animation
  useEffect(() => {
    const currentSnippet = CodeSnippets[snippetIndex];
    let timer: NodeJS.Timeout;

    if (!isDeleting && charIndex < currentSnippet.length) {
      // Typing
      timer = setTimeout(() => {
        setDisplayText((prev) => prev + currentSnippet[charIndex]);
        setCharIndex((prev) => prev + 1);
      }, 35);
    } else if (isDeleting && charIndex > 0) {
      // Deleting
      timer = setTimeout(() => {
        setDisplayText((prev) => prev.slice(0, -1));
        setCharIndex((prev) => prev - 1);
      }, 15);
    } else if (charIndex === currentSnippet.length && !isDeleting) {
      // Stay on full snippet
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 3500);
    } else if (charIndex === 0 && isDeleting) {
      // Switch snippet
      setIsDeleting(false);
      setSnippetIndex((prev) => (prev + 1) % CodeSnippets.length);
    }

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, snippetIndex]);

  // Accounting calculator loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isBalancing) {
      interval = setInterval(() => {
        setDebitCount((prev) => {
          const next = prev + Math.floor(Math.random() * 15000) + 1200;
          if (next > 450000) {
            setIsBalancing(false);
            setCreditCount(next); // Auto Balance at peak
            return next;
          }
          return next;
        });

        setCreditCount((prev) => {
          // Lag slightly behind to create accounting visual
          const next = prev + Math.floor(Math.random() * 14000) + 800;
          return next;
        });
      }, 80);
    } else {
      // Stay balanced for a while, then reset
      interval = setTimeout(() => {
        setDebitCount(0);
        setCreditCount(0);
        setIsBalancing(true);
      }, 5000);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(interval);
    };
  }, [isBalancing]);

  // Floating mathematical particles
  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      symbol: ["+", "-", "×", "÷", "=", "∑", "%", "$", "IQD", "0", "1"][i % 11],
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 8}s`,
      size: `${12 + Math.random() * 20}px`
    }));
  }, []);

  return (
    <div className="min-height-[calc(100vh-80px)] p-6 bg-slate-950 text-slate-100 flex flex-col justify-between rtl font-sans overflow-hidden relative">
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
            زانیاری گەشەپێدەر و گۆشەی جوڵەی ئەزموونی ژمێریاری
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch z-10 flex-grow">
        {/* Left Column: Motion Graphics Terminal */}
        <div className="flex flex-col gap-5 justify-between bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-md relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Mock Code Writing Terminal */}
          <div className="flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                ledger-balance.ts — VS Code
              </span>
            </div>
            
            <div className="font-mono text-xs text-indigo-300 bg-slate-950/80 rounded-2xl p-4 flex-grow overflow-auto border border-slate-900/60 shadow-inner relative">
              <pre className="whitespace-pre-wrap leading-relaxed select-none">
                {displayText}
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-400 animate-pulse vertical-middle" />
              </pre>
            </div>
          </div>

          {/* Ledger Balancer Graphics */}
          <div className="bg-slate-950/60 border border-slate-800/50 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400">هاوسەنگکەری ئەلیکترۆنی دەفتەری گشتی</span>
              {isBalancing ? (
                <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full animate-pulse font-bold">
                  لە ئەژمارکردندایە...
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  هاوسەنگ بوو ✓
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Debit visual */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">کۆی لایەنی قەرزدار (Debit)</div>
                <div className="text-lg font-black text-rose-400 font-mono">
                  {debitCount.toLocaleString("en-US")} $
                </div>
              </div>
              
              {/* Credit visual */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">کۆی لایەنی داواکار (Credit)</div>
                <div className="text-lg font-black text-emerald-400 font-mono">
                  {creditCount.toLocaleString("en-US")} $
                </div>
              </div>
            </div>

            {/* Differential Bar */}
            <div className="mt-3">
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                <div 
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{ width: `${isBalancing ? Math.max(20, Math.min(80, (debitCount / (debitCount + creditCount || 1)) * 100)) : 50}%` }}
                />
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${isBalancing ? Math.max(20, Math.min(80, (creditCount / (debitCount + creditCount || 1)) * 100)) : 50}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 mt-1 font-mono">
                <span>تەفاوت: {(debitCount - creditCount).toLocaleString("en-US")} USD</span>
                <span>هاوسەنگی: {isBalancing ? "0%" : "100%"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Details Card */}
        <div className="bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between shadow-2xl relative">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-5">
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4">
              <div className="text-xs text-indigo-400 font-extrabold mb-1">زانیاری سەرەکی پرۆژە</div>
              <p className="text-sm leading-relaxed text-slate-300 font-medium">
                ئەم پڕۆژەیە بە دیزاینێکی پێشکەوتوو و کۆدە پپتەوکانی بەکارخراوە و جێبەجێ کراوە لە لایەن:
              </p>
              
              <div className="mt-3 flex items-center gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div className="w-11 h-11 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-black text-white text-lg shadow-lg">
                  HF
                </div>
                <div>
                  <div className="text-base font-black text-slate-100">هێمن فەرهاد حسێن</div>
                  <div className="text-xs text-indigo-400 font-bold">ژمێریاری ئەزموونی و گەشەپێدەر</div>
                </div>
              </div>
            </div>

            {/* List details */}
            <div className="space-y-3">
              {/* Phone item */}
              <div className="flex items-center gap-3.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-colors">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <PhoneIcon />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">ژمارەی پەیوەندی کردن</div>
                  <div className="text-sm font-black text-slate-200 font-mono tracking-wide mt-0.5">
                    ٠٧٧٠١٤٠٣٠٣٨ - ٠٧٥٠١٧٣٤٠٠٦
                  </div>
                </div>
              </div>

              {/* Email item */}
              <a 
                href="mailto:Hemn1996@gmail.com" 
                className="flex items-center gap-3.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-colors no-underline block"
              >
                <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <EmailIcon />
                </div>
                <div className="flex-grow">
                  <div className="text-[10px] text-slate-500 font-bold">ناونیشانی ئیمەیڵ</div>
                  <div className="text-sm font-black text-slate-200 font-mono mt-0.5">
                    Hemn1996@gmail.com
                  </div>
                </div>
              </a>

              {/* Address item */}
              <div className="flex items-center gap-3.5 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 hover:border-pink-500/40 transition-colors">
                <div className="p-2 bg-pink-500/10 rounded-xl border border-pink-500/20">
                  <MapIcon />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">ناونیشان</div>
                  <div className="text-sm font-black text-slate-200 mt-0.5">
                    سلێمانی
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex gap-3">
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
      <div className="flex items-center justify-center gap-2 text-xs text-slate-600 mt-6 pt-4 border-t border-slate-900 z-10">
        <span>دروستکراوە بە</span>
        <HeartIcon />
        <span>بۆ بەڕێوەبردنی ژمێریاری کۆگا و دارایی</span>
      </div>
    </div>
  );
}
