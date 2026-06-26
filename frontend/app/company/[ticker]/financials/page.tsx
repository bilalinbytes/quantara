'use client';

import { useState, useEffect } from 'react';
import { TopNav, BottomTabs } from '../../../../components/layout';
import { HeroSection } from '../../../../features/company';
import { useCompanyProfile, useCompanyPrice } from '../../../../hooks/useCompanyData';
import { useCompanyFinancials, useAIFinancialAnalysis } from '../../../../hooks/useFinancialData';
import { Skeleton } from '../../../../components/ui';
import { StatementGrid } from '../../../../features/financials/StatementGrid';
import { AIFinancialAnalyst } from '../../../../features/financials/AIFinancialAnalyst';
import { API_BASE } from '../../../../lib/apiConfig';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

export default function FinancialsPage({ params }: { params: Promise<{ ticker: string }> }) {
  const resolvedParams = use(params);
  const ticker = resolvedParams.ticker;

  const [activeTab, setActiveTab] = useState('Income Statement');
  
  const { data: profile, isLoading: loadingProfile } = useCompanyProfile(ticker);
  const { data: price, isLoading: loadingPrice } = useCompanyPrice(ticker);
  const { data: financials, isLoading: loadingFin } = useCompanyFinancials(ticker);
  
  const aiMutation = useAIFinancialAnalysis();
  
  useEffect(() => {
    if (activeTab === 'AI Analysis' && !aiMutation.data && !aiMutation.isPending && !aiMutation.isSuccess) {
      aiMutation.mutate(ticker);
    }
  }, [activeTab, ticker]);

  const loading = loadingProfile || loadingPrice || loadingFin;

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

  const tabs = ['Income Statement', 'Balance Sheet', 'Cash Flow', 'Ratios', 'AI Analysis'];

  // Formatting helpers
  const formatCurrency = (val: number) => `$${(val / 1000).toFixed(1)}B`;
  const formatRatio = (val: number) => `${val.toFixed(1)}%`;
  
  const years = financials?.annual.map((y: any) => y.date.split('-')[0]).reverse() || [];

  const incomeStatementRows = [
    { label: 'Revenue', values: financials?.annual.map((y: any) => formatCurrency(y.revenue)).reverse() || [] },
    { label: 'Gross Profit', values: financials?.annual.map((y: any) => formatCurrency(y.gross_profit)).reverse() || [] },
    { label: 'Operating Income', values: financials?.annual.map((y: any) => formatCurrency(y.operating_income)).reverse() || [] },
    { label: 'Net Income', values: financials?.annual.map((y: any) => formatCurrency(y.net_income)).reverse() || [] },
  ];

  const balanceSheetRows = [
    { label: 'Total Assets', values: financials?.annual.map((y: any) => formatCurrency(y.assets)).reverse() || [] },
    { label: 'Total Liabilities', values: financials?.annual.map((y: any) => formatCurrency(y.liabilities)).reverse() || [] },
    { label: 'Total Equity', values: financials?.annual.map((y: any) => formatCurrency(y.equity)).reverse() || [] },
  ];

  const cashFlowRows = [
    { label: 'Operating Cash Flow', values: financials?.annual.map((y: any) => formatCurrency(y.operating_cf)).reverse() || [] },
    { label: 'Investing Cash Flow', values: financials?.annual.map((y: any) => formatCurrency(y.investing_cf)).reverse() || [] },
    { label: 'Financing Cash Flow', values: financials?.annual.map((y: any) => formatCurrency(y.financing_cf)).reverse() || [] },
    { label: 'Free Cash Flow', values: financials?.annual.map((y: any) => formatCurrency(y.free_cash_flow)).reverse() || [] },
  ];

  const ratiosRows = [
    { label: 'Gross Margin', values: financials?.annual.map((y: any) => formatRatio(y.gross_margin)).reverse() || [] },
    { label: 'Operating Margin', values: financials?.annual.map((y: any) => formatRatio(y.operating_margin)).reverse() || [] },
    { label: 'ROE', values: financials?.annual.map((y: any) => formatRatio(y.roe)).reverse() || [] },
    { label: 'ROA', values: financials?.annual.map((y: any) => formatRatio(y.roa)).reverse() || [] },
  ];

  const handleExportCSV = () => {
    window.open(`${API_BASE}/exports/financials/${ticker}/csv`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-200 selection:bg-blue-500/30 font-sans flex flex-col">
      <TopNav />
      <BottomTabs />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <HeroSection data={{ ...profile, livePrice: price?.price || 0, changePercent: price?.change_1d || 0, marketCap: profile?.market_cap || '', volume: price?.volume || '' }} />
        
        {/* Tabs & Export CSV */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex overflow-x-auto hide-scrollbar gap-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.08]'}`}
              >
                {tab === 'AI Analysis' && <SparklesIcon className={activeTab === tab ? 'text-white' : 'text-blue-400'} />}
                {tab}
              </button>
            ))}
          </div>
          {activeTab !== 'AI Analysis' && (
            <button onClick={handleExportCSV} className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-sm font-semibold transition-colors flex items-center gap-2 self-start md:self-auto">
              Export CSV
            </button>
          )}
        </div>

        {/* Content */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'Income Statement' && <StatementGrid headers={years} rows={incomeStatementRows} />}
          {activeTab === 'Balance Sheet' && <StatementGrid headers={years} rows={balanceSheetRows} />}
          {activeTab === 'Cash Flow' && <StatementGrid headers={years} rows={cashFlowRows} />}
          {activeTab === 'Ratios' && <StatementGrid headers={years} rows={ratiosRows} />}
          {activeTab === 'AI Analysis' && (
            <div className="w-full">
              {aiMutation.isPending && (
                <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p>Quantara AI is analyzing {ticker} financials...</p>
                </div>
              )}
              {aiMutation.isError && (
                <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 flex gap-3 items-center">
                  <AlertCircle /> Failed to generate AI analysis.
                </div>
              )}
              {aiMutation.isSuccess && aiMutation.data && (
                <AIFinancialAnalyst data={aiMutation.data} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}
