'use client';

import { TopNav, BottomTabs } from '../../../components/layout';
import { HeroSection, CompanyOverview, QuickFacts } from '../../../features/company';
import { InteractivePriceChart } from '../../../features/chart';
import { MetricsGrid, FinancialSnapshot } from '../../../features/financials';
import { AISnapshotCard } from '../../../features/ai';
import { Skeleton } from '../../../components/ui';
import { useCompanyProfile, useCompanyPrice, useCompanyMetrics, useCompanyAI } from '../../../hooks/useCompanyData';
import { AlertCircle } from 'lucide-react';
import { use } from 'react';

export default function CompanyDashboardPage({ params }: { params: Promise<{ ticker: string }> }) {
  const resolvedParams = use(params);
  const ticker = resolvedParams.ticker;

  const { data: profile, isLoading: loadingProfile, isError: errProfile } = useCompanyProfile(ticker);
  const { data: price, isLoading: loadingPrice } = useCompanyPrice(ticker);
  const { data: metricsData, isLoading: loadingMetrics } = useCompanyMetrics(ticker);
  const { data: aiData, isLoading: loadingAI } = useCompanyAI(ticker);

  const loading = loadingProfile || loadingPrice || loadingMetrics || loadingAI;

  if (errProfile) {
    return (
      <div className="min-h-screen bg-[#080d18] flex items-center justify-center text-slate-200">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold">No company data found.</h2>
          <button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            Return to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-200 selection:bg-blue-500/30 font-sans flex flex-col">
      <TopNav />
      <BottomTabs />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
        {loading ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div className="flex gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="w-48 h-8" />
                  <Skeleton className="w-32 h-4" />
                </div>
              </div>
              <div className="space-y-2 items-end flex flex-col">
                <Skeleton className="w-32 h-10" />
                <Skeleton className="w-48 h-4" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 space-y-6">
                 <Skeleton className="w-full h-[400px] rounded-2xl" />
                 <Skeleton className="w-full h-48 rounded-2xl" />
               </div>
               <div className="space-y-6">
                 <Skeleton className="w-full h-[600px] rounded-2xl" />
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <HeroSection data={{ ...profile, livePrice: price?.price || 0, changePercent: price?.change_1d || 0, marketCap: profile?.market_cap || '', volume: price?.volume || '', isFallback: price?.is_fallback || false }} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Main Column */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <InteractivePriceChart ticker={ticker} />
                <MetricsGrid metrics={metricsData?.metrics || []} />
                <CompanyOverview data={profile} />
              </div>
              
              {/* Right Sidebar */}
              <div className="flex flex-col gap-6">
                <QuickFacts data={{
                  status:         price?.status || 'Market Open',
                  exchange:       profile?.exchange || 'N/A',
                  sector:         profile?.sector || 'N/A',
                  industry:       profile?.industry || 'N/A',
                  employees:      profile?.employees || 'N/A',
                  ceo:            profile?.ceo || 'N/A',
                  country:        profile?.country || 'USA',
                  founded:        profile?.founded || 'N/A',
                  currency:       'USD',
                  website:        profile?.website || 'N/A',
                }} />

                <AISnapshotCard data={aiData} />
                <FinancialSnapshot snapshot={metricsData?.snapshot || []} />
              </div>
              
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
