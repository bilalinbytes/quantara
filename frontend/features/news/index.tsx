import { Card, CardHeader, CardTitle, CardContent, Badge } from "../../components/ui";
import { Activity, Zap, Newspaper, TrendingUp, AlertTriangle, Bot, Send, Loader2, ChevronRight, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useState, useRef, useEffect } from 'react';
import { useCompanyChat } from '../../hooks/useNewsData';

export function IntelligenceHero({ ticker, sentimentData, newsCount }: any) {
  if (!sentimentData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        <CardContent className="p-8 flex items-center justify-between h-full">
          <div>
            <div className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold">Overall Sentiment</div>
            <div className="text-4xl font-bold text-white mb-2">{sentimentData.overall_sentiment}</div>
            <Badge variant="brand" className="shadow-[0_0_15px_rgba(59,130,246,0.3)]">High Confidence</Badge>
          </div>
          <div className="w-32 h-32">
             {/* A simple mock gauge representation using PieChart */}
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={[{ value: sentimentData.positive_pct, color: '#10b981' }, { value: sentimentData.neutral_pct, color: '#64748b' }, { value: sentimentData.negative_pct, color: '#f43f5e' }]} cx="50%" cy="50%" innerRadius={35} outerRadius={50} dataKey="value" startAngle={180} endAngle={0}>
                   <Cell fill="#10b981" />
                   <Cell fill="#64748b" />
                   <Cell fill="#f43f5e" />
                 </Pie>
               </PieChart>
             </ResponsiveContainer>
             <div className="text-center mt-[-40px] text-xl font-bold text-emerald-400">{sentimentData.positive_pct}%</div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="flex flex-col justify-center items-center text-center p-6 bg-white/[0.02]">
        <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 mb-4"><Newspaper size={24} /></div>
        <div className="text-3xl font-bold text-white mb-1">{newsCount || 0}</div>
        <div className="text-sm text-slate-400">News Articles Today</div>
      </Card>

      <Card className="flex flex-col justify-center items-center text-center p-6 bg-white/[0.02]">
        <div className="p-3 bg-amber-500/10 rounded-full text-amber-400 mb-4"><Zap size={24} /></div>
        <div className="text-3xl font-bold text-white mb-1">{sentimentData.timeline?.length || 0}</div>
        <div className="text-sm text-slate-400">Major Events</div>
      </Card>
    </div>
  );
}

export function WhyMovingCard({ analysisData }: any) {
  if (!analysisData) return null;

  return (
    <Card className="mb-8 border-emerald-500/20 bg-emerald-500/5 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
       <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.05] pb-4">
         <div className="flex items-center gap-3">
           <Activity className="w-6 h-6 text-emerald-400" />
           <CardTitle className="text-xl">Why Is This Stock Moving?</CardTitle>
         </div>
       </CardHeader>
       <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
         <div>
           <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">AI Explanation</h4>
           <p className="text-lg text-slate-300 leading-relaxed">{analysisData.why_moving}</p>
         </div>
         <div>
           <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Top Catalysts</h4>
           <ul className="space-y-3">
             {analysisData.catalysts?.map((c: string, i: number) => (
               <li key={i} className="flex gap-3 items-start">
                 <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">{i+1}</div>
                 <span className="text-slate-300">{c}</span>
               </li>
             ))}
           </ul>
         </div>
       </CardContent>
    </Card>
  );
}

export function NewsFeed({ newsData }: any) {
  if (!newsData || !newsData.news) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
      <h3 className="text-xl font-bold text-white mb-6">Latest News Feed</h3>
      {newsData.news.map((article: any, i: number) => (
        <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" className="block group">
          <Card className="hover:bg-white/[0.04] transition-colors overflow-hidden">
            <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-start">
              {article.image && (
                <div className="w-full md:w-48 h-32 shrink-0 rounded-lg overflow-hidden bg-white/[0.05]">
                  <img src={article.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <Badge variant="brand" className={article.sentiment === 'Bullish' ? 'bg-emerald-500/20 text-emerald-400' : article.sentiment === 'Bearish' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-400'}>
                    {article.sentiment}
                  </Badge>
                  <span className="text-xs text-slate-500 font-medium">{article.source}</span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="text-xs text-slate-500">{new Date(article.published_at).toLocaleString()}</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">{article.title}</h4>
                <p className="text-sm text-slate-400 line-clamp-2">{article.summary}</p>
              </div>
            </CardContent>
          </Card>
        </a>
      ))}
    </div>
  );
}

export function SentimentDashboard({ sentimentData }: any) {
  if (!sentimentData) return null;

  const data = [
    { name: 'Positive', value: sentimentData.positive_pct, color: '#10b981' },
    { name: 'Neutral', value: sentimentData.neutral_pct, color: '#64748b' },
    { name: 'Negative', value: sentimentData.negative_pct, color: '#f43f5e' },
  ];

  return (
    <Card className="h-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
       <CardHeader>
         <CardTitle>Sentiment Breakdown</CardTitle>
       </CardHeader>
       <CardContent>
         <div className="h-64 w-full relative">
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                 {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
               </Pie>
               <Tooltip contentStyle={{ backgroundColor: '#0d1424', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
             </PieChart>
           </ResponsiveContainer>
         </div>
         <div className="space-y-3 mt-4">
           {data.map(d => (
             <div key={d.name} className="flex justify-between items-center text-sm">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                 <span className="text-slate-300">{d.name}</span>
               </div>
               <span className="font-bold text-white">{d.value}%</span>
             </div>
           ))}
         </div>
       </CardContent>
    </Card>
  );
}

export function TopAIInsights({ analysisData }: any) {
  if (!analysisData) return null;

  return (
    <Card className="h-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
       <CardHeader>
         <CardTitle>Top AI Insights</CardTitle>
       </CardHeader>
       <CardContent className="space-y-6">
         {analysisData.daily_ai_summary && (
           <div>
             <h4 className="text-sm font-semibold text-blue-400 mb-2">Daily AI Summary</h4>
             <p className="text-sm text-slate-300 leading-relaxed">{analysisData.daily_ai_summary}</p>
           </div>
         )}
         <div>
           <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-2"><TrendingUp size={16} /> Positive Drivers</h4>
           <ul className="space-y-1">
             {(analysisData.positive_drivers || analysisData.positive_news || analysisData.bullish_points || []).map((d: string, i: number) => <li key={i} className="text-sm text-slate-300">• {d}</li>)}
           </ul>
         </div>
         <div>
           <h4 className="flex items-center gap-2 text-sm font-semibold text-rose-400 mb-2"><AlertTriangle size={16} /> Negative Drivers</h4>
           <ul className="space-y-1">
             {(analysisData.negative_drivers || analysisData.negative_news || analysisData.bearish_points || []).map((d: string, i: number) => <li key={i} className="text-sm text-slate-300">• {d}</li>)}
           </ul>
         </div>
         {analysisData.upcoming_events?.length > 0 && (
           <div>
             <h4 className="text-sm font-semibold text-amber-400 mb-2">Upcoming Events</h4>
             <ul className="space-y-1">
               {analysisData.upcoming_events.map((e: string, i: number) => <li key={i} className="text-sm text-slate-300">• {e}</li>)}
             </ul>
           </div>
         )}
         <div className="pt-4 border-t border-white/[0.05]">
           <h4 className="text-sm font-semibold text-blue-400 mb-2">Investor Takeaway</h4>
           <p className="text-sm text-slate-300 leading-relaxed">{analysisData.investor_takeaway}</p>
           {analysisData.market_sentiment && (
             <div className="mt-3 flex gap-2 flex-wrap">
               <Badge variant="brand">Sentiment: {analysisData.market_sentiment}</Badge>
               {analysisData.recommendation && <Badge variant="brand">{analysisData.recommendation}</Badge>}
               {analysisData.confidence && <Badge variant="brand">Confidence: {analysisData.confidence}%</Badge>}
             </div>
           )}
         </div>
         {analysisData.evidence?.length > 0 && (
           <div className="pt-4 border-t border-white/[0.05]">
             <h4 className="text-sm font-semibold text-slate-400 mb-2">Evidence Used</h4>
             <div className="space-y-1">
               {analysisData.evidence.map((e: any, i: number) => (
                 <div key={i} className={`text-xs ${e.available ? 'text-emerald-400' : 'text-slate-500'}`}>
                   {e.available ? '✅' : '❌'} {e.label}{!e.available ? ' unavailable' : ''}
                 </div>
               ))}
             </div>
           </div>
         )}
       </CardContent>
    </Card>
  );
}

export function PressReleasesCard({ analysisData }: any) {
  const releases = analysisData?.press_releases;
  if (!releases?.length) return null;
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <CardHeader><CardTitle>Press Releases</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {releases.slice(0, 5).map((r: any, i: number) => (
          <div key={i} className="text-sm border-b border-white/[0.05] pb-2 last:border-0">
            <a href={r.url || '#'} target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-400 font-medium">{r.title}</a>
            {r.summary && <p className="text-slate-400 mt-1 line-clamp-2">{r.summary}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AnalystRatingsCard({ analysisData }: any) {
  const ratings = analysisData?.analyst_ratings_detail;
  if (!ratings?.length) return null;
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <CardHeader><CardTitle>Analyst Ratings</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {ratings.map((r: string, i: number) => (
            <li key={i} className="text-sm text-slate-300 flex gap-2"><ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />{r}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// --- Suggested prompt chips ---
const SUGGESTED_PROMPTS = [
  "Is this a good long-term investment?",
  "What are the main risks?",
  "Is the stock overvalued?",
  "What's moving the stock today?",
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  confidence?: string;
  sources?: string[];
  sentiment_signal?: string;
}

export function InvestmentChatbot({ ticker }: { ticker: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your AI investment analyst for **${ticker.toUpperCase()}**. Ask me anything about the company — investment thesis, risks, valuation, recent news, or earnings. I use real-time data and RAG to give you grounded answers.`,
      confidence: 'N/A',
      sources: [],
      sentiment_signal: 'Neutral',
    },
  ]);
  const [input, setInput] = useState('');
  const chatMutation = useCompanyChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || chatMutation.isPending) return;

    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const data = await chatMutation.mutateAsync({ ticker, question });
      const content = data.summary || data.answer || 'No response received.';
      const confidence = data.confidence || 'N/A';
      const sources = data.sources || [];
      // Derive sentiment from recommendation
      const rec = (data.recommendation || '').toLowerCase();
      const sentiment_signal = rec.includes('buy') ? 'Bullish' : rec.includes('sell') ? 'Bearish' : 'Neutral';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content, confidence, sources, sentiment_signal },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: err?.message || 'Request failed. Check your API key configuration.' },
      ]);
    }
  };

  const sentimentColor = (sig?: string) => {
    if (sig === 'Bullish') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (sig === 'Bearish') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-slate-400 bg-white/[0.05] border-white/[0.1]';
  };

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <p key={i} className={`${line.startsWith('•') || line.startsWith('*') ? 'ml-2' : ''} leading-relaxed`}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <Card className="flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent overflow-hidden">
      <CardHeader className="border-b border-white/[0.05] pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>
            <CardTitle className="text-base">AI Investment Analyst</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">RAG Active</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">Powered by news, filings &amp; financial data</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-0 p-0 flex-1">
        <div className="flex flex-col gap-4 p-4 overflow-y-auto max-h-[420px] min-h-[200px]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm space-y-1 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white/[0.04] border border-white/[0.06] text-slate-300 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? renderContent(msg.content) : <p>{msg.content}</p>}
                </div>

                {msg.role === 'assistant' && msg.confidence && msg.confidence !== 'N/A' && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {msg.sentiment_signal && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${sentimentColor(msg.sentiment_signal)}`}>
                        {msg.sentiment_signal}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600">Confidence: {msg.confidence}</span>
                    {msg.sources && msg.sources.length > 0 && (
                      <span className="text-[10px] text-slate-600">Sources: {msg.sources.join(', ')}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-2 justify-start">
              <div className="shrink-0 w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  <span className="text-xs text-slate-400">Analyzing data…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-300 transition-colors"
              >
                <ChevronRight className="w-3 h-3" /> {p}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 pb-4 pt-2 border-t border-white/[0.05] shrink-0">
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(input); }}
            className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-blue-500/40 transition-colors"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Ask about ${ticker.toUpperCase()}…`}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
              disabled={chatMutation.isPending}
            />
            <button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
