'use client';

import { useState, useRef, useEffect, use, useCallback } from 'react';
import { TopNav, BottomTabs } from '../../../../components/layout';
import { useCompanyProfile, useCompanyPrice } from '../../../../hooks/useCompanyData';
import {
  Bot, Send, Loader2, Sparkles, ChevronRight, FileText, TrendingUp,
  AlertTriangle, BarChart2, Newspaper, BookOpen, Copy, CheckCheck,
  MessageSquare, Trash2, Plus, ChevronDown,
} from 'lucide-react';import { API_BASE } from '../../../../lib/apiConfig';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Citation { text: string; source: string; section?: string; }
interface InvestmentCard {
  summary: string;
  investment_score?: number;
  recommendation?: string;
  confidence?: string | number;
  bullish_points?: string[];
  bearish_points?: string[];
  financial_health?: string;
  valuation?: string;
  technical_outlook?: string;
  technical_analysis?: string;
  price_target?: string;
  risk_level?: string;
  sources?: string[];
  sources_used?: string[];
  missing_sources?: string[];
  evidence?: { label: string; available: boolean }[];
  citations?: Citation[];
  related_news?: string[];
  follow_up_questions?: string[];
}
interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  confidence?: string;
  investment_card?: InvestmentCard | null;
  citations?: Citation[];
  sources?: string[];
  isStreaming?: boolean;
}
interface ChatSession { id: number; title: string; ticker: string; updated_at: string; }

const INTENT_META: Record<string, { label: string; color: string; Icon: any }> = {
  investment: { label: 'Investment Analysis', color: 'text-blue-400',    Icon: TrendingUp   },
  risk:       { label: 'Risk Assessment',      color: 'text-rose-400',   Icon: AlertTriangle },
  valuation:  { label: 'Valuation',            color: 'text-amber-400',  Icon: BarChart2     },
  news:       { label: 'Market Intelligence',  color: 'text-emerald-400',Icon: Newspaper     },
  earnings:   { label: 'Earnings Analysis',    color: 'text-purple-400', Icon: BarChart2     },
  research:   { label: 'Research Report',      color: 'text-indigo-400', Icon: BookOpen      },
  sec:        { label: 'SEC Filing RAG',        color: 'text-cyan-400',   Icon: FileText      },
  general:    { label: 'General Query',        color: 'text-slate-400',  Icon: Bot           },
};

const SUGGESTED = [
  { label: 'Investment thesis',  prompt: 'Is this a good long-term investment?',         Icon: TrendingUp   },
  { label: 'Key risks',          prompt: 'What are the main risks?',                     Icon: AlertTriangle },
  { label: 'Valuation',          prompt: 'Is this stock overvalued or undervalued?',     Icon: BarChart2     },
  { label: 'Recent news',        prompt: 'What is moving the stock right now?',          Icon: Newspaper     },
  { label: 'Earnings summary',   prompt: 'Summarize the most recent earnings results.',  Icon: BarChart2     },
  { label: 'Generate report',    prompt: 'Generate an institutional investment report.', Icon: BookOpen      },
  { label: 'Summarize 10-K',     prompt: 'Summarize the latest 10-K filing.',            Icon: FileText      },
  { label: 'Compare to sector',  prompt: 'How does this company compare to its sector?',Icon: ChevronRight  },
];

// ─── Markdown renderer ───────────────────────────────────────────────────────

function Md({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-white mt-3 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith('## '))  return <h2 key={i} className="text-base font-bold text-white mt-4 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith('# '))   return <h1 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>;
        if (line.startsWith('---'))  return <hr key={i} className="border-white/[0.08] my-2" />;
        if (line.trim() === '')      return <div key={i} className="h-2" />;
        const parts = line.split(/\*\*(.+?)\*\*/g);
        const rendered = parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{p}</strong> : p);
        if (/^[•\*\-]\s/.test(line)) {
          return <p key={i} className="flex gap-2 leading-relaxed"><span className="text-blue-400 shrink-0 mt-0.5">•</span><span>{rendered}</span></p>;
        }
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\./)?.[1];
          const rest = line.replace(/^\d+\.\s/, '');
          return <p key={i} className="flex gap-2 leading-relaxed"><span className="text-blue-400 font-bold w-4 shrink-0">{num}.</span><span>{rest}</span></p>;
        }
        return <p key={i} className="leading-relaxed">{rendered}</p>;
      })}
    </div>
  );
}

// ─── Investment Card ─────────────────────────────────────────────────────────

function InvestmentCardView({ card, onFollowUp }: { card: InvestmentCard; onFollowUp: (q: string) => void }) {
  const [showSources, setShowSources] = useState(false);
  const scoreColor = (s?: number) => !s ? 'text-slate-400' : s >= 7 ? 'text-emerald-400' : s >= 5 ? 'text-amber-400' : 'text-rose-400';
  const recColor = (r?: string) => {
    if (!r) return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    if (/strong buy/i.test(r)) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (/buy/i.test(r)) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (/strong sell/i.test(r)) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    if (/sell/i.test(r)) return 'bg-red-500/20 text-red-300 border-red-500/30';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return (
    <div className="mt-3 space-y-3 w-full">
      {/* Score + Recommendation */}
      <div className="flex items-center gap-3 flex-wrap">
        {card.investment_score && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
            <span className="text-xs text-slate-400">Score</span>
            <span className={`text-lg font-black ${scoreColor(card.investment_score)}`}>{card.investment_score}/10</span>
          </div>
        )}
        {card.recommendation && (
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${recColor(card.recommendation)}`}>
            {card.recommendation}
          </span>
        )}
        {card.confidence && (
          <span className="px-2.5 py-1 rounded-xl text-xs text-slate-400 bg-white/[0.03] border border-white/[0.06]">
            {card.confidence} confidence
          </span>
        )}
        {card.risk_level && (
          <span className="px-2.5 py-1 rounded-xl text-xs text-slate-400 bg-white/[0.03] border border-white/[0.06]">
            Risk: {card.risk_level}
          </span>
        )}
      </div>

      {/* Bullish / Bearish */}
      <div className="grid grid-cols-2 gap-2">
        {(card.bullish_points?.length ?? 0) > 0 && (
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Bullish
            </div>
            <ul className="space-y-1">
              {card.bullish_points!.map((p, i) => <li key={i} className="text-xs text-slate-300 flex gap-1.5"><span className="text-emerald-400 shrink-0">+</span>{p}</li>)}
            </ul>
          </div>
        )}
        {(card.bearish_points?.length ?? 0) > 0 && (
          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
            <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Bearish
            </div>
            <ul className="space-y-1">
              {card.bearish_points!.map((p, i) => <li key={i} className="text-xs text-slate-300 flex gap-1.5"><span className="text-rose-400 shrink-0">−</span>{p}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Key stats */}
      {(card.financial_health || card.valuation || card.price_target || card.technical_outlook) && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Financial Health', value: card.financial_health },
            { label: 'Valuation',        value: card.valuation },
            { label: 'Price Target',     value: card.price_target },
            { label: 'Technical',        value: card.technical_outlook },
          ].filter(x => x.value).map(x => (
            <div key={x.label} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">{x.label}</div>
              <div className="text-xs text-slate-200">{x.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence Used */}
      {(card.evidence?.length ?? 0) > 0 && (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Evidence Used</div>
          <div className="grid grid-cols-1 gap-1">
            {card.evidence!.map((e, i) => (
              <div key={i} className={`text-xs flex items-center gap-2 ${e.available ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span>{e.available ? '✅' : '❌'}</span>
                <span>{e.label}{!e.available ? ' unavailable' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Citations / Sources toggle */}
      {((card.citations?.length ?? 0) > 0 || (card.sources?.length ?? 0) > 0 || (card.sources_used?.length ?? 0) > 0) && (
        <button onClick={() => setShowSources(s => !s)} className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronDown className={`w-3 h-3 transition-transform ${showSources ? 'rotate-180' : ''}`} />
          {showSources ? 'Hide' : 'Show'} sources ({(card.citations?.length ?? 0) + (card.sources_used?.length ?? card.sources?.length ?? 0)})
        </button>
      )}
      {showSources && (
        <div className="space-y-1">
          {(card.sources_used ?? card.sources)?.map((s, i) => (
            <div key={i} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-black/20 border border-white/[0.04] text-blue-400">{s}</div>
          ))}
          {card.citations?.map((c, i) => (
            <div key={i} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-black/20 border border-white/[0.04] flex justify-between gap-2">
              <span className="text-slate-400 italic line-clamp-1">"{c.text}"</span>
              <span className="text-emerald-400 shrink-0">{c.source}</span>
            </div>
          ))}
        </div>
      )}

      {/* Follow-up questions */}
      {(card.follow_up_questions?.length ?? 0) > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Follow-up questions</div>
          <div className="flex flex-wrap gap-1.5">
            {card.follow_up_questions!.map((q, i) => (
              <button key={i} onClick={() => onFollowUp(q)}
                className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-slate-300 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-300 transition-all">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AssistantPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const { data: profile } = useCompanyProfile(ticker);
  const { data: price }   = useCompanyPrice(ticker);

  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input, setInput]           = useState('');
  const [isPending, setIsPending]   = useState(false);
  const [copied, setCopied]         = useState<number | null>(null);
  const [sessionId, setSessionId]   = useState<number | null>(null);
  const [sessions, setSessions]     = useState<Record<string, ChatSession[]>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isPending]);

  const loadSessions = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/companies/${ticker}/chat/sessions`);
      if (r.ok) setSessions(await r.json());
    } catch {}
  }, [ticker]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const loadSession = async (id: number) => {
    try {
      const r = await fetch(`${API_BASE}/chat/sessions/${id}/messages`);
      if (!r.ok) return;
      const data = await r.json();
      setSessionId(id);
      setMessages(data.messages.map((m: any) => ({
        id: m.id, role: m.role, content: m.content,
        intent: m.intent, confidence: m.confidence,
        investment_card: m.investment_card,
        citations: m.citations || [], sources: m.sources || [],
      })));
      setSidebarOpen(false);
    } catch {}
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`${API_BASE}/chat/sessions/${id}`, { method: 'DELETE' });
    if (sessionId === id) { setMessages([]); setSessionId(null); }
    loadSessions();
  };

  const newConversation = () => { setMessages([]); setSessionId(null); setSidebarOpen(false); };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };
  const copyMsg = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const REASONING = [
    'Fetching live price & metrics…',
    'Reading financial statements…',
    'Scanning recent news headlines…',
    'Routing to AI analyst…',
    'Generating structured analysis…',
  ];

  const send = async (question: string) => {
    if (!question.trim() || isPending) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    setMessages(prev => [...prev, { role: 'user', content: question.trim() }]);
    setIsPending(true);
    setReasoningSteps([]);

    // Show reasoning steps progressively
    let step = 0;
    const stepTimer = setInterval(() => {
      if (step < REASONING.length) {
        setReasoningSteps(prev => [...prev, REASONING[step]]);
        step++;
      } else {
        clearInterval(stepTimer);
      }
    }, 600);

    // Optimistic streaming placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

    try {
      const res = await fetch(`${API_BASE}/companies/${ticker}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), session_id: sessionId }),
      });

      clearInterval(stepTimer);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        setReasoningSteps([]);
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `**Configuration Required**\n\n${err.detail || 'API error'}`,
          isStreaming: false,
        }]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let streamed = '';
      let finalData: Record<string, unknown> | null = null;

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.error) {
                setReasoningSteps([]);
                setMessages(prev => [...prev.slice(0, -1), {
                  role: 'assistant',
                  content: `**Error**\n\n${evt.error}`,
                  isStreaming: false,
                }]);
                return;
              }
              if (evt.status) {
                setReasoningSteps(prev => [...prev, evt.status]);
              }
              if (evt.token) {
                streamed += evt.token;
                setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: streamed, isStreaming: true }]);
              }
              if (evt.done) {
                finalData = evt;
              }
            } catch { /* skip malformed SSE */ }
          }
        }
      }

      setReasoningSteps([]);

      if (finalData) {
        if (finalData.session_id) { setSessionId(finalData.session_id as number); loadSessions(); }
        const fullText = (finalData.summary as string) || streamed;
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: fullText,
          intent: finalData!.intent as string,
          confidence: String(finalData!.confidence ?? ''),
          investment_card: finalData as InvestmentCard,
          citations: (finalData!.citations as Citation[]) || [],
          sources: (finalData!.sources_used as string[]) || [],
          isStreaming: false,
        }]);
      } else if (streamed) {
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: streamed,
          isStreaming: false,
        }]);
      }
    } catch (e: any) {
      clearInterval(stepTimer);
      setReasoningSteps([]);
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: `**Network Error**\n\nCould not reach the Quantara API. Is the backend running?`,
        isStreaming: false,
      }]);
    } finally {
      setIsPending(false);
    }
  };

  const companyName = profile?.name || ticker.toUpperCase();
  const livePrice   = price?.price?.toFixed(2) ?? '—';
  const pct         = price?.change_1d;
  const isPos       = (pct ?? 0) >= 0;
  const hasSessions  = Object.values(sessions).some(g => g.length > 0);

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-200 flex flex-col font-sans">
      <TopNav />
      <BottomTabs />

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 113px)' }}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className={`flex flex-col bg-[#0a0f1a] border-r border-white/[0.06] transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">History</span>
            <button onClick={newConversation} className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors" title="New chat">
              <Plus className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 space-y-4">
            {hasSessions ? Object.entries(sessions).map(([group, list]) => list.length > 0 && (
              <div key={group}>
                <div className="px-4 py-1 text-[10px] text-slate-600 uppercase tracking-wider font-bold">{group}</div>
                {list.map(s => (
                  <button key={s.id} onClick={() => loadSession(s.id)}
                    className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between group hover:bg-white/[0.04] transition-colors ${sessionId === s.id ? 'bg-blue-500/10 text-blue-300' : 'text-slate-300'}`}>
                    <span className="truncate flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 shrink-0 text-slate-600" />{s.title}
                    </span>
                    <button onClick={e => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))}
              </div>
            )) : (
              <div className="px-4 py-6 text-xs text-slate-600 text-center">No conversations yet</div>
            )}
          </div>
        </aside>

        {/* ── Main chat area ───────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0">

          {/* Context bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-[#080d18] shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(s => !s)}
                className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors">
                <MessageSquare className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/[0.08] flex items-center justify-center font-black text-white text-sm">
                {ticker.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">{companyName}</div>
                <div className="text-xs text-slate-500">{ticker.toUpperCase()} · {profile?.exchange || 'NASDAQ'} · {profile?.sector || '—'}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">${livePrice}</div>
              <div className={`text-xs font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPos ? '+' : ''}{pct?.toFixed(2) ?? '—'}%
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 max-w-4xl mx-auto w-full">
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center pt-6 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-500/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Quantara AI — {ticker.toUpperCase()} Analyst</h2>
                  <p className="text-sm text-slate-400 max-w-md">Powered by live financials, SEC filings, news intelligence and multi-agent reasoning.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
                  {SUGGESTED.map((s, i) => (
                    <button key={i} onClick={() => send(s.prompt)}
                      className="flex items-center gap-2.5 text-left px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-blue-500/30 transition-all group">
                      <s.Icon className="w-4 h-4 text-slate-500 group-hover:text-blue-400 shrink-0 transition-colors" />
                      <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => {
              const meta = msg.intent ? INTENT_META[msg.intent] : null;
              const Icon = meta?.Icon;
              const card = msg.investment_card;
              return (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/40 to-indigo-600/40 border border-blue-500/20 flex items-center justify-center mt-1">
                      {msg.isStreaming ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : <Sparkles className="w-4 h-4 text-blue-400" />}
                    </div>
                  )}
                  <div className={`max-w-[88%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {meta && !msg.isStreaming && (
                      <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
                        {Icon && <Icon className="w-3 h-3" />}
                        {meta.label}{msg.confidence && <span className="opacity-50 ml-1">· {msg.confidence}</span>}
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white/[0.04] border border-white/[0.07] text-slate-200 rounded-bl-sm'}`}>
                      {msg.role === 'user' ? <p>{msg.content}</p> : <Md text={msg.content} />}
                      {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse rounded-sm align-middle" />}
                    </div>

                    {/* Investment card — only for completed assistant messages with real data */}
                    {msg.role === 'assistant' && !msg.isStreaming && card && card.investment_score && (
                      <div className="w-full">
                        <InvestmentCardView card={card} onFollowUp={send} />
                      </div>
                    )}

                    {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                      <button onClick={() => copyMsg(idx, msg.content)} className="text-[10px] text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors">
                        {copied === idx ? <><CheckCheck className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Reasoning steps while pending */}
            {isPending && reasoningSteps.length > 0 && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl rounded-bl-sm px-4 py-3 space-y-1.5">
                  {reasoningSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {i < reasoningSteps.length - 1
                        ? <CheckCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        : <Loader2 className="w-3 h-3 text-blue-400 animate-spin shrink-0" />}
                      <span className={i < reasoningSteps.length - 1 ? 'text-slate-500 line-through' : 'text-slate-300'}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 md:px-8 py-4 border-t border-white/[0.06] max-w-4xl mx-auto w-full shrink-0">
            {messages.length > 0 && messages.length < 5 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {SUGGESTED.slice(0, 4).map((s, i) => (
                  <button key={i} onClick={() => send(s.prompt)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:border-blue-500/30 hover:bg-blue-500/10 transition-all">
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <div className={`flex items-end gap-3 bg-white/[0.04] border rounded-2xl px-4 py-3 transition-all ${isPending ? 'border-white/[0.06]' : 'border-white/[0.08] focus-within:border-blue-500/40 focus-within:shadow-[0_0_20px_-4px_rgba(59,130,246,0.2)]'}`}>
              <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                placeholder={`Ask anything about ${companyName}… (Shift+Enter for new line)`}
                rows={1} disabled={isPending}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none resize-none leading-relaxed py-0.5 disabled:opacity-50"
                style={{ minHeight: '24px', maxHeight: '160px' }}
              />
              <button onClick={() => send(input)} disabled={!input.trim() || isPending}
                className="shrink-0 w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg shadow-blue-500/20">
                {isPending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 text-center mt-2">
              Quantara AI uses live market data, SEC filings &amp; Groq LLM reasoning. Requires GROQ_API_KEY in .env. Not financial advice.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
