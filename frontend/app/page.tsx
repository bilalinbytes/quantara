'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, FileText, Newspaper, Briefcase, ChevronRight, Zap, Database, Lock, Cpu } from 'lucide-react';
import { API_BASE } from '../lib/apiConfig';

const PLACEHOLDERS = [
  "Search Apple...",
  "Compare NVIDIA vs AMD",
  "Summarize Tesla earnings",
  "Analyze Microsoft's 10-K",
  "Find semiconductor companies growing above 20%",
  "Why did Amazon margins improve?"
];

const POPULAR_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "TSLA", "AMZN", "META"];

const FEATURES = [
  {
    title: "Company Research",
    description: "Analyze fundamentals, valuation, growth and financial health.",
    icon: <TrendingUp className="w-5 h-5 text-blue-400" />
  },
  {
    title: "SEC Filing Intelligence",
    description: "Chat with annual reports and quarterly filings using AI.",
    icon: <FileText className="w-5 h-5 text-blue-400" />
  },
  {
    title: "Market Intelligence",
    description: "Summarize market news with sentiment analysis.",
    icon: <Newspaper className="w-5 h-5 text-blue-400" />
  },
  {
    title: "Portfolio Analysis",
    description: "Risk analysis, diversification and AI recommendations.",
    icon: <Briefcase className="w-5 h-5 text-blue-400" />
  }
];

const CAPABILITIES = [
  "Financial Statement Analysis",
  "Earnings Call Intelligence",
  "SEC Filing Analysis",
  "News Intelligence",
  "Competitor Comparison",
  "Valuation Metrics",
  "Portfolio Risk",
  "AI Investment Reports"
];

const BADGES = ["LLMs", "RAG", "LangGraph", "Vector Search", "Real-Time Market Data", "Explainable AI"];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/search?q=${query}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
        }
      } catch (e) {
        // mock results for local dev without backend
        setResults([
          { ticker: query.toUpperCase(), name: `${query.toUpperCase()} Corporation` }
        ]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query) router.push(`/company/${query.toUpperCase()}`);
  };

  const handleTickerClick = (ticker: string) => {
    router.push(`/company/${ticker}`);
  };

  return (
    <div className="relative min-h-screen bg-[#080d18] text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* --- BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPHBhdGggZD0iTTAgMGg0MHYxSDB6TTAgMHY0MGgxVDB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+Cjwvc3ZnPg==')] opacity-50"></div>
        
        {/* Glowing blurred gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]"></div>
        <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[60%] h-[30%] rounded-full bg-blue-600/10 blur-[150px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center">
        
        {/* --- TOP SECTION --- */}
        <div className="flex flex-col items-center text-center mb-16 max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-2xl backdrop-blur-md">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-inner shadow-white/20">
               <span className="font-bold text-white text-xl">Q</span>
             </div>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/60">
            Quantara
          </h1>
          
          <h2 className="text-xl lg:text-2xl font-medium text-blue-400 mb-6 tracking-wide">
            AI-Powered Financial Intelligence Platform
          </h2>
          
          <p className="text-lg lg:text-xl text-slate-400 font-light leading-relaxed max-w-2xl">
            Research companies using AI, SEC filings, earnings calls, financial statements, market news, and institutional-grade investment intelligence.
          </p>
        </div>

        {/* --- SEARCH SECTION --- */}
        <div className="w-full max-w-3xl mb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
          <form 
            onSubmit={handleSearch}
            className={`relative flex items-center w-full transition-all duration-500 rounded-2xl bg-[#111827]/60 backdrop-blur-xl border ${isFocused ? 'border-blue-500/50 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]' : 'border-white/[0.08] shadow-2xl'}`}
          >
            <div className="pl-6 pr-4 text-slate-400">
              <Search size={24} className={isFocused ? 'text-blue-400' : ''} />
            </div>
            
            <div className="relative w-full h-16 flex items-center">
              <input
                type="text"
                className="w-full h-full bg-transparent text-white text-lg placeholder-transparent focus:outline-none z-10 relative"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              {/* Rotating Placeholder */}
              {!query && (
                 <div className="absolute inset-y-0 left-0 flex items-center text-slate-500 text-lg transition-opacity duration-300 pointer-events-none">
                    <span className="animate-pulse">{PLACEHOLDERS[placeholderIdx]}</span>
                 </div>
              )}
            </div>

            <div className="pr-4">
              <button type="submit" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-medium transition-colors border border-white/5 flex items-center gap-2">
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-sans bg-black/30 rounded border border-white/10 text-slate-400">↵</kbd>
              </button>
            </div>

            {/* Dropdown Results */}
            {results.length > 0 && isFocused && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-[#111827]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden z-50 p-2">
                {results.map((result: any, i) => (
                  <button
                    key={result.ticker}
                    onMouseDown={() => handleTickerClick(result.ticker)}
                    className="w-full text-left px-4 py-4 hover:bg-white/[0.04] rounded-xl flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center text-blue-400 font-semibold border border-white/[0.05] group-hover:border-blue-500/30 transition-colors">
                        {result.ticker.substring(0,2)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{result.ticker}</div>
                        <div className="text-sm text-slate-500">{result.name}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* --- QUICK ACTION CHIPS --- */}
        <div className="flex flex-wrap justify-center gap-3 mb-32 animate-in fade-in duration-1000 delay-300 max-w-2xl">
          {POPULAR_TICKERS.map(ticker => (
            <button 
              key={ticker}
              onClick={() => handleTickerClick(ticker)}
              className="px-4 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-sm font-medium text-slate-400 hover:text-white transition-all hover:scale-105 active:scale-95"
            >
              {ticker}
            </button>
          ))}
        </div>

        {/* --- FEATURE GRID --- */}
        <div className="w-full mb-32 relative">
           <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              {FEATURES.map((feature, i) => (
                <div key={i} className="group p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-500 hover:-translate-y-1 shadow-xl backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
           </div>
        </div>

        {/* --- AI CAPABILITIES SECTION --- */}
        <div className="w-full max-w-4xl mb-32 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-16">
            Everything an Institutional Analyst Does — <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Automated.</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
             {CAPABILITIES.map((cap, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-slate-300">
                   <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                     <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                   </div>
                   <span className="font-medium">{cap}</span>
                </div>
             ))}
          </div>
        </div>

        {/* --- SOCIAL PROOF / TECH STACK --- */}
        <div className="w-full mb-32 text-center">
           <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">Powered by Industry Leading Architecture</p>
           <div className="flex flex-wrap justify-center gap-6 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
              {BADGES.map((badge, i) => (
                <span key={i} className="px-4 py-2 text-sm font-medium text-slate-400 bg-[#0d1424] rounded-lg border border-slate-800 shadow-inner">
                  {badge}
                </span>
              ))}
           </div>
        </div>

        {/* --- BOTTOM CTA --- */}
        <div className="w-full max-w-3xl text-center py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/10 to-transparent blur-3xl pointer-events-none"></div>
          <h2 className="text-4xl font-bold text-white mb-6 relative z-10">Ready to research your next investment?</h2>
          <p className="text-xl text-slate-400 mb-10 relative z-10">Search any company and let AI do the heavy lifting.</p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="relative z-10 px-8 py-4 bg-white text-slate-900 rounded-full font-semibold text-lg hover:bg-blue-50 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] flex items-center gap-3 mx-auto group"
          >
            Start Researching
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
}
