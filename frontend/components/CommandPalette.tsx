'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronRight, TrendingUp, LayoutDashboard, Loader2, Clock } from 'lucide-react';
import { API_BASE } from '../lib/apiConfig';

const RECENT_KEY = 'quantara_recent_tickers';
const MAX_RECENT = 5;

function getRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecent(ticker: string) {
  const existing = getRecent().filter(t => t !== ticker);
  localStorage.setItem(RECENT_KEY, JSON.stringify([ticker, ...existing].slice(0, MAX_RECENT)));
}

export function CommandPalette() {
  const [isOpen, setIsOpen]   = useState(false);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recent, setRecent]   = useState<string[]>([]);
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toggle with Ctrl/Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsOpen(p => !p); }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults((await res.json()).results || []);
      } catch { setResults([]); }
      finally { setIsLoading(false); }
    }, 220);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  const navigate = (path: string, ticker?: string) => {
    if (ticker) saveRecent(ticker);
    setIsOpen(false);
    router.push(path);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-[#0d1424] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
          {isLoading
            ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            : <Search className="w-4 h-4 text-slate-500 shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && query.trim()) {
                navigate(`/company/${query.trim().toUpperCase()}`, query.trim().toUpperCase());
              }
            }}
            placeholder="Search ticker or company…  (e.g. AAPL, Microsoft)"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
          />
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">

          {/* Live search results */}
          {results.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Results</div>
              {results.map((r: any) => (
                <button
                  key={r.ticker}
                  onClick={() => navigate(`/company/${r.ticker}`, r.ticker)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                    {r.ticker.slice(0, 2)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold text-white">{r.ticker}</div>
                    <div className="text-xs text-slate-500 truncate">{r.name}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Recent searches */}
          {query.length < 2 && recent.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Recent
              </div>
              {recent.map(t => (
                <button
                  key={t}
                  onClick={() => navigate(`/company/${t}`, t)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                    {t.slice(0, 2)}
                  </div>
                  <span className="flex-1 text-left text-sm text-slate-300">{t}</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Quick nav */}
          {query.length < 2 && (
            <div>
              <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Navigation</div>
              {[
                { label: 'Watchlists & Alerts',   path: '/watchlists', icon: TrendingUp },
                { label: 'Admin Dashboard',        path: '/admin',      icon: LayoutDashboard },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <span className="flex-1 text-left text-sm text-slate-300">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && !isLoading && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No results for "{query}" —{' '}
              <button
                onClick={() => navigate(`/company/${query.toUpperCase()}`, query.toUpperCase())}
                className="text-blue-400 hover:underline"
              >
                go to {query.toUpperCase()}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-black/30 border-t border-white/[0.06] flex justify-between text-[10px] text-slate-600">
          <span>⌘K to toggle</span>
          <span className="flex gap-3">
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span><kbd className="font-mono">Esc</kbd> close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
