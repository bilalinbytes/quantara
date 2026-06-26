'use client';

import { useState, useEffect, use } from 'react';
import { TopNav, BottomTabs } from '../../../../components/layout';
import { HeroSection } from '../../../../features/company';
import { useCompanyProfile, useCompanyPrice } from '../../../../hooks/useCompanyData';
import { useCompanyNews, useCompanySentiment, useAnalyzeCompanyNews } from '../../../../hooks/useNewsData';
import { Skeleton } from '../../../../components/ui';
import {
  IntelligenceHero,
  WhyMovingCard,
  NewsFeed,
  SentimentDashboard,
  InvestmentChatbot,
  TopAIInsights,
  PressReleasesCard,
  AnalystRatingsCard,
} from '../../../../features/news';

const FILTERS = ['All', 'AI', 'M&A', 'Macro', 'Upgrades', 'Legal'];

export default function NewsIntelligencePage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const [activeFilter, setActiveFilter] = useState('All');

  const { data: profile, isLoading: loadingProfile } = useCompanyProfile(ticker);
  const { data: price,   isLoading: loadingPrice   } = useCompanyPrice(ticker);
  const { data: newsData,     isLoading: loadingNews      } = useCompanyNews(ticker);
  const { data: sentimentData, isLoading: loadingSentiment } = useCompanySentiment(ticker);
  const aiMutation = useAnalyzeCompanyNews();

  useEffect(() => {
    if (!aiMutation.data && !aiMutation.isPending && !aiMutation.isSuccess) {
      aiMutation.mutate(ticker);
    }
  }, [ticker]);

  // Filter news client-side by category keyword
  const filteredNews = activeFilter === 'All'
    ? newsData
    : {
        ...newsData,
        news: (newsData?.news || []).filter((a: any) =>
          a.category?.toLowerCase().includes(activeFilter.toLowerCase()) ||
          a.title?.toLowerCase().includes(activeFilter.toLowerCase())
        ),
      };

  const loading = loadingProfile || loadingPrice || loadingNews || loadingSentiment;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d18] text-slate-200">
        <TopNav />
        <BottomTabs />
        <main className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
          <Skeleton className="w-full h-48 rounded-2xl" />
          <Skeleton className="w-full h-56 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="w-full h-32 rounded-2xl" />
              <Skeleton className="w-full h-32 rounded-2xl" />
              <Skeleton className="w-full h-32 rounded-2xl" />
            </div>
            <Skeleton className="w-full h-[500px] rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-200 selection:bg-blue-500/30 font-sans flex flex-col">
      <TopNav />
      <BottomTabs />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

        <HeroSection data={{
          ...profile,
          livePrice:     price?.price     || 0,
          changePercent: price?.change_1d || 0,
          marketCap:     profile?.market_cap || '',
          volume:        price?.volume    || '',
          isFallback:    price?.is_fallback || false,
        }} />

        {/* Sentiment + stats hero */}
        <IntelligenceHero
          ticker={ticker}
          sentimentData={sentimentData}
          newsCount={newsData?.news?.length}
        />

        {/* AI catalyst card — only after analysis resolves */}
        {aiMutation.isSuccess && (
          <>
            <WhyMovingCard analysisData={aiMutation.data} />
            {aiMutation.data?.executive_summary && (
              <div className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                <h3 className="text-lg font-bold text-white mb-2">AI Market Intelligence Summary</h3>
                <p className="text-slate-300 leading-relaxed">{aiMutation.data.executive_summary || aiMutation.data.summary}</p>
              </div>
            )}
          </>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: news feed ─────────────────────────────── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Filter chips */}
            <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-1">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    f === activeFilter
                      ? 'bg-white text-[#080d18] shadow-md'
                      : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <NewsFeed newsData={filteredNews} />
          </div>

          {/* ── Right: sentiment + AI chatbot ───────────────── */}
          <div className="flex flex-col gap-6">
            {aiMutation.isSuccess && <TopAIInsights analysisData={aiMutation.data} />}
            <SentimentDashboard sentimentData={sentimentData} />
            {aiMutation.isSuccess && <AnalystRatingsCard analysisData={aiMutation.data} />}
            {aiMutation.isSuccess && <PressReleasesCard analysisData={aiMutation.data} />}
            <InvestmentChatbot ticker={ticker} />
          </div>

        </div>
      </main>
    </div>
  );
}
