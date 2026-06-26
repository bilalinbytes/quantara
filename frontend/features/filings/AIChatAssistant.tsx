import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui";
import { Send, Bot, User, BookmarkPlus, Search, Loader2 } from 'lucide-react';
import { API_BASE } from '../../lib/apiConfig';

export function AIChatAssistant({ ticker, filingId }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !filingId) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE}/chat/filings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg.content,
          ticker,
          filing_type: "10-K",
          history: messages
        })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = { role: 'assistant', content: '', citations: null };
      
      setMessages(prev => [...prev, assistantMsg]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                assistantMsg.content += data.token;
                setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
              }
              if (data.done) {
                assistantMsg.citations = data.citations;
                setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
                setIsTyping(false);
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setIsTyping(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col pl-6 border-l border-white/[0.05]">
      <CardHeader className="px-0 pt-0 pb-4 border-b border-white/[0.05]">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            AI Research Assistant
          </div>
          <button className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors bg-white/[0.05] px-3 py-1.5 rounded-full">
            <BookmarkPlus size={14} /> Workspace
          </button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto px-0 py-4 hide-scrollbar space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 mb-2">
              <Search size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-200">Ask Quantara</h3>
            <p className="text-sm text-slate-400 max-w-[250px]">Select a filing and ask anything. The AI will extract exact answers with citations.</p>
            <div className="flex flex-col gap-2 w-full max-w-[300px] mt-4">
              {["What are the primary risks?", "Summarize the MD&A section", "How is the company using AI?"].map((q, i) => (
                <button key={i} onClick={() => setInput(q)} className="text-xs text-left p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] text-slate-300 transition-colors">
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0"><Bot size={16} /></div>}
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white/[0.05] text-slate-300 rounded-tl-sm border border-white/[0.05]'}`}>
                <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/[0.1] space-y-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sources</span>
                    {m.citations.map((c: any, j: number) => (
                      <div key={j} className="text-xs p-2 rounded bg-black/30 border border-white/[0.05] flex justify-between items-start gap-2 hover:bg-black/50 cursor-pointer">
                        <span className="text-slate-300 line-clamp-2">"{c.text}"</span>
                        <span className="shrink-0 font-medium text-emerald-400">{c.section}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0"><Bot size={16} /></div>
            <div className="bg-white/[0.05] p-4 rounded-2xl rounded-tl-sm border border-white/[0.05] flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-400" />
              <span className="text-xs text-slate-400">Searching vector space...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="pt-4 border-t border-white/[0.05]">
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={filingId ? "Ask a question about this filing..." : "Select a filing first..."}
            disabled={!filingId || isTyping}
            className="w-full bg-[#0d1424] border border-white/[0.1] rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || !filingId || isTyping}
            className="absolute right-2 p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
