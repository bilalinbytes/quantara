'use client';

import { useState, use } from 'react';
import { TopNav, BottomTabs } from '../../../../components/layout';
import { HeroSection } from '../../../../features/company';
import { useCompanyProfile, useCompanyPrice } from '../../../../hooks/useCompanyData';
import { Skeleton, Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui';
import { API_BASE } from '../../../../lib/apiConfig';
import { Bot, CheckCircle2, Circle, Loader2, Download, FileText, ChevronDown, BookmarkPlus } from 'lucide-react';

export default function ResearchPage({ params }: { params: Promise<{ ticker: string }> }) {
  const resolvedParams = use(params);
  const ticker = resolvedParams.ticker;
  
  const { data: profile, isLoading: loadingProfile } = useCompanyProfile(ticker);
  const { data: price, isLoading: loadingPrice } = useCompanyPrice(ticker);

  const [isGenerating, setIsGenerating] = useState(false);
  const [agentsStatus, setAgentsStatus] = useState<Record<string, string>>({});
  const [report, setReport] = useState<any>(null);
  const [reportMeta, setReportMeta] = useState<any>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const agentsList = [
    "Financial Agent", "SEC Agent", "News Agent", "Market Agent", 
    "Risk Agent", "Competition Agent", "Valuation Agent", "Macro Agent"
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setReport(null);
    setReportMeta(null);
    setReportError(null);
    setAgentsStatus({});
    
    try {
      const response = await fetch(`${API_BASE}/companies/${ticker}/research/generate`, {
        method: 'POST'
      });
      
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.status === 'agent_running') {
                setAgentsStatus(prev => ({ ...prev, [data.agent]: 'running' }));
              } else if (data.status === 'agent_complete') {
                setAgentsStatus(prev => ({ ...prev, [data.agent]: 'complete' }));
              } else if (data.status === 'complete') {
                setReport(data.report);
                setReportMeta(data.metadata || null);
                setIsGenerating(false);
              } else if (data.status === 'error') {
                setReportError(data.message || 'Report generation failed.');
                setIsGenerating(false);
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    window.open(`${API_BASE}/exports/research/${ticker}/pdf`, '_blank');
  };

  const handleExportMarkdown = () => {
    window.open(`${API_BASE}/exports/research/${ticker}/markdown`, '_blank');
  };

  const loading = loadingProfile || loadingPrice;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d18] text-slate-200">
        <TopNav />
        <BottomTabs />
        <main className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
          <Skeleton className="w-full h-32 rounded-2xl" />
          <Skeleton className="w-full h-[600px] rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-200 selection:bg-blue-500/30 font-sans flex flex-col">
      <TopNav />
      <BottomTabs />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <HeroSection data={{ ...profile, livePrice: price?.price || 0, changePercent: price?.change_1d || 0, marketCap: profile?.market_cap || '', volume: price?.volume || '' }} />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Panel: Agent Timeline */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="border-b border-white/[0.05] pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-400" />
                  Multi-Agent Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {!isGenerating && !report ? (
                  <button onClick={handleGenerate} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20">
                    Generate Report
                  </button>
                ) : (
                  <div className="space-y-3">
                    {agentsList.map((agent, i) => {
                      const status = agentsStatus[agent];
                      return (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          {status === 'complete' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : status === 'running' ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : <Circle className="w-4 h-4 text-slate-600" />}
                          <span className={`${status === 'complete' ? 'text-emerald-400 font-medium' : status === 'running' ? 'text-blue-400 font-medium' : 'text-slate-500'}`}>{agent}</span>
                        </div>
                      )
                    })}
                    {isGenerating && Object.values(agentsStatus).every(s => s === 'complete') && (
                       <div className="flex items-center gap-3 text-sm mt-4 pt-4 border-t border-white/[0.1]">
                          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                          <span className="text-purple-400 font-medium">Synthesizing findings...</span>
                       </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {report && (
              <Card className="bg-[#0d1424]/50">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-300">Export Report</h4>
                  <button onClick={handleExportPDF} className="w-full py-2 bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 text-sm text-blue-400 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium">
                    <FileText size={16} /> Export to PDF
                  </button>
                  <button onClick={handleExportMarkdown} className="w-full py-2 bg-white/[0.05] hover:bg-white/[0.1] text-sm text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Download size={16} /> Export Markdown
                  </button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel: Report Viewer */}
          <div className="lg:col-span-3">
             {report ? (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                 <div className="flex items-center justify-between pb-4 border-b border-white/[0.1]">
                   <h2 className="text-2xl font-bold text-white">Institutional AI Research Report</h2>
                   <div className="flex items-center gap-3">
                     {reportMeta && (
                       <div className="flex gap-3 text-xs text-slate-500">
                         <span>⏱ {reportMeta.generation_time_s}s</span>
                         <span>~{reportMeta.approx_tokens?.toLocaleString()} tokens</span>
                         <span>{reportMeta.agents_used} agents</span>
                       </div>
                     )}
                     <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                       Finalized
                     </div>
                   </div>
                 </div>

                 <div className="space-y-4">
                   {report.map((sec: any, i: number) => (
                     <Card key={i} className="overflow-hidden border-white/[0.05] bg-[#0d1424]/30">
                       <div 
                         className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                         onClick={() => setActiveSection(activeSection === i ? null : i)}
                       >
                         <h3 className="text-lg font-bold text-slate-200">{sec.title}</h3>
                         <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${activeSection === i ? 'rotate-180' : ''}`} />
                       </div>
                       {activeSection === i && (
                         <div className="p-6 pt-0 text-slate-300 leading-relaxed border-t border-white/[0.05] bg-[#0d1424]/50">
                           <div className="mt-4">{sec.content}</div>
                           
                           {sec.citations && sec.citations.length > 0 && (
                             <div className="mt-6 pt-4 border-t border-white/[0.05] space-y-2">
                               <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supporting Evidence</span>
                               {sec.citations.map((c: any, j: number) => (
                                 <div key={j} className="text-xs p-3 rounded-lg bg-black/40 border border-white/[0.05] flex flex-col gap-1">
                                   <span className="text-slate-400 italic">"{c.text}"</span>
                                   <div className="flex items-center justify-between mt-2">
                                     <span className="text-blue-400 font-medium">Source: {c.source}</span>
                                     <button className="text-slate-500 hover:text-white transition-colors"><BookmarkPlus size={14}/></button>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       )}
                     </Card>
                   ))}
                 </div>
               </div>
             ) : (
               <div className="h-[600px] flex items-center justify-center border border-white/[0.05] rounded-2xl bg-[#0d1424]/30">
                 {reportError ? (
                   <div className="text-center space-y-4 max-w-md px-6">
                     <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                       <FileText size={24} className="text-amber-400" />
                     </div>
                     <h3 className="text-white font-bold">Configuration Required</h3>
                     <p className="text-sm text-slate-400">{reportError}</p>
                     <button onClick={handleGenerate} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl font-medium transition-colors">
                       Retry
                     </button>
                   </div>
                 ) : (
                   <div className="text-center space-y-3 text-slate-500">
                     <FileText size={48} className="mx-auto opacity-50" />
                     <p className="text-lg">Click "Generate Report" to orchestrate the AI agents.</p>
                     <p className="text-sm text-slate-600">Requires GROQ_API_KEY + NEWS_API_KEY in .env</p>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}
