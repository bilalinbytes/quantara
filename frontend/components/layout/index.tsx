'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Sun, LayoutDashboard, Loader2, ChevronRight, X } from 'lucide-react';
import { API_BASE } from '../../lib/apiConfig';

// ─── TopNav ────────────────────────────────────────────────────────────────

export function TopNav() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const navigate = (ticker: string) => {
    setQuery('');
    setResults([]);
    setIsFocused(false);
    router.push(`/company/${ticker}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(query.trim().toUpperCase());
  };

  const showDropdown = isFocused && (results.length > 0 || (query.length >= 2 && isLoading));

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#080d18]/90 backdrop-blur-xl">
      <div className="flex h-14 items-center px-5 gap-6 max-w-screen-2xl mx-auto">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="font-black text-white text-xs">Q</span>
          </div>
          <span className="text-base font-bold text-white tracking-tight">Quantara</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/watchlists" className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
            Watchlists
          </Link>
          <Link href="/admin" className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" /> Admin
          </Link>
        </div>

        {/* Search */}
        <div className="flex-1 flex justify-center px-4">
          <form onSubmit={handleSubmit} className="relative w-full max-w-md">
            <div className={`flex items-center gap-2 bg-white/[0.04] border rounded-xl px-3 py-1.5 transition-all duration-200 ${isFocused ? 'border-blue-500/50 bg-white/[0.06] shadow-[0_0_20px_-4px_rgba(59,130,246,0.25)]' : 'border-white/[0.06]'}`}>
              {isLoading
                ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                : <Search className="w-4 h-4 text-slate-500 shrink-0" />
              }
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                placeholder="Search ticker or company… (e.g. AAPL, Microsoft)"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none min-w-0"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setResults([]); }} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:block shrink-0 text-[10px] text-slate-600 font-mono border border-white/[0.06] px-1.5 py-0.5 rounded bg-black/20">⌘K</kbd>
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#0d1424]/98 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
                {isLoading && results.length === 0 ? (
                  <div className="px-4 py-3 flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                  </div>
                ) : (
                  <div className="py-1">
                    {results.map((r: any) => (
                      <button
                        key={r.ticker}
                        onMouseDown={() => navigate(r.ticker)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                            {r.ticker.slice(0, 2)}
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-slate-100">{r.ticker}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[180px]">{r.name}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors">
            <Sun className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold ml-1 cursor-pointer hover:opacity-90 transition-opacity">
            Q
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── BottomTabs (company sub-nav) ──────────────────────────────────────────

export function BottomTabs() {
  const pathname = usePathname();
  if (!pathname) return null;

  const segments = pathname.split('/');
  const companyIdx = segments.indexOf('company');
  const ticker = companyIdx !== -1 && segments[companyIdx + 1] ? segments[companyIdx + 1] : '';
  if (!ticker) return null;

  const navItems = [
    { label: 'Overview',    path: `/company/${ticker}`,            exact: true },
    { label: 'Financials',  path: `/company/${ticker}/financials`              },
    { label: 'News',        path: `/company/${ticker}/news`                    },
    { label: 'SEC Filings', path: `/company/${ticker}/filings`                 },
    { label: 'Quantara AI', path: `/company/${ticker}/assistant`               },
    { label: 'Research',    path: `/company/${ticker}/research`                },
  ];

  return (
    <div className="w-full border-b border-white/[0.06] bg-[#080d18]/80 backdrop-blur-md sticky top-14 z-40">
      <div className="flex overflow-x-auto px-5 hide-scrollbar max-w-screen-2xl mx-auto">
        {navItems.map(item => {
          const isActive = item.exact
            ? pathname === item.path
            : pathname.startsWith(item.path);

          const isAI = item.label === 'Quantara AI';

          return (
            <Link
              key={item.label}
              href={item.path}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
                isActive
                  ? 'border-blue-500 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              } ${isAI && !isActive ? 'text-blue-400/70' : ''}`}
            >
              {isAI && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              )}
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
