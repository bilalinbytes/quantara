'use client';

import { useState } from 'react';
import { use } from 'react';
import { TopNav, BottomTabs } from '../../../../components/layout';
import { HeroSection } from '../../../../features/company';
import { useCompanyProfile, useCompanyPrice } from '../../../../hooks/useCompanyData';
import { useFilingsList, useParsedFiling } from '../../../../hooks/useFilingsData';
import { Skeleton } from '../../../../components/ui';
import { FilingsSidebar, DocumentViewer, AIChatAssistant } from '../../../../features/filings';


export default function FilingsPage({ params, searchParams }: { params: Promise<{ ticker: string }>, searchParams?: any }) {
  const resolvedParams = use(params);
  const ticker = resolvedParams.ticker;
  
  const [selectedFilingId, setSelectedFilingId] = useState<string | null>(null);

  const { data: profile, isLoading: loadingProfile } = useCompanyProfile(ticker);
  const { data: price, isLoading: loadingPrice } = useCompanyPrice(ticker);
  const { data: filingsData, isLoading: loadingFilings } = useFilingsList(ticker);
  const { data: parsedFiling, isLoading: loadingDocument } = useParsedFiling(ticker, selectedFilingId);

  const loading = loadingProfile || loadingPrice || loadingFilings;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d18] text-slate-200">
        <TopNav />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
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
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col gap-6 h-[calc(100vh-130px)]">
        {/* Smaller Hero for more screen real estate */}
        <div className="shrink-0 flex items-center justify-between border border-white/[0.05] bg-[#0d1424]/50 rounded-xl p-4">
           <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center font-bold text-lg">{ticker.substring(0, 1)}</div>
             <div>
               <h1 className="text-xl font-bold">{profile?.name || ticker}</h1>
               <div className="text-xs text-slate-400 flex items-center gap-2">
                 <span>{profile?.exchange}</span> • <span>{profile?.sector}</span>
               </div>
             </div>
           </div>
           <div className="text-right">
             <div className="text-xl font-bold">${price?.price?.toFixed(2) || '0.00'}</div>
             <div className={`text-sm ${price?.change_1d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
               {price?.change_1d >= 0 ? '+' : ''}{price?.change_1d?.toFixed(2)}%
             </div>
           </div>
        </div>

        {/* 3-Panel RAG Interface */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-0 border border-white/[0.1] bg-[#080d18] rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Left Panel: Sidebar */}
          <div className="md:col-span-3 p-4 bg-[#0d1424]/30 border-r border-white/[0.05]">
            <FilingsSidebar 
              filings={filingsData?.filings || []} 
              onSelectFiling={setSelectedFilingId} 
              selectedFilingId={selectedFilingId}
            />
          </div>

          {/* Center Panel: Document Viewer */}
          <div className="md:col-span-5 relative bg-[#080d18]">
            {loadingDocument ? (
               <div className="w-full h-full flex items-center justify-center">
                 <Skeleton className="w-[80%] h-[80%] rounded-xl" />
               </div>
            ) : (
               <DocumentViewer parsedFiling={parsedFiling} />
            )}
          </div>

          {/* Right Panel: AI Chat Assistant */}
          <div className="md:col-span-4 bg-[#0d1424]/50 relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            <AIChatAssistant ticker={ticker} filingId={selectedFilingId} />
          </div>

        </div>
      </main>
    </div>
  );
}
