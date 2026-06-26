'use client';

import { useState, useEffect } from 'react';
import { TopNav } from '../../components/layout';
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton } from '../../components/ui';
import { 
  useWatchlists, 
  useCreateWatchlist, 
  useDeleteWatchlist, 
  useAddTicker, 
  useRemoveTicker, 
  useAlerts, 
  useUpdateAlert, 
  useDailyBriefing, 
  useTriggerMonitoring,
  Alert
} from '../../hooks/useWatchlistData';
import { 
  Plus, 
  Trash2, 
  Pin, 
  Check, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  RefreshCw, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Globe, 
  FileClock, 
  TrendingUp, 
  X, 
  Loader2, 
  CheckCircle2, 
  Calendar 
} from 'lucide-react';
import Link from 'next/link';

export default function WatchlistsPage() {
  const { data: watchlists, isLoading: loadingWL } = useWatchlists();
  const { data: alerts, isLoading: loadingAlerts } = useAlerts();
  const { data: briefing, isLoading: loadingBriefing } = useDailyBriefing();

  const createWLMutation = useCreateWatchlist();
  const deleteWLMutation = useDeleteWatchlist();
  const addTickerMutation = useAddTicker();
  const removeTickerMutation = useRemoveTicker();
  const updateAlertMutation = useUpdateAlert();
  const triggerMonitorMutation = useTriggerMonitoring();

  // State
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const [newWLName, setNewWLName] = useState('');
  const [newTicker, setNewTicker] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isCreatingWL, setIsCreatingWL] = useState(false);
  const [tickerError, setTickerError] = useState('');
  const [triggerSuccess, setTriggerSuccess] = useState(false);

  // Set initial active watchlist
  useEffect(() => {
    if (watchlists && watchlists.length > 0 && activeWatchlistId === null) {
      setActiveWatchlistId(watchlists[0].id);
    }
  }, [watchlists, activeWatchlistId]);

  const activeWL = watchlists?.find(wl => wl.id === activeWatchlistId) || watchlists?.[0];

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWLName.trim()) return;
    try {
      const newWl = await createWLMutation.mutateAsync(newWLName.trim());
      setActiveWatchlistId(newWl.id);
      setNewWLName('');
      setIsCreatingWL(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWatchlist = async (id: number) => {
    if (confirm('Are you sure you want to delete this watchlist?')) {
      try {
        await deleteWLMutation.mutateAsync(id);
        if (activeWatchlistId === id) {
          setActiveWatchlistId(null);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAddTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWL || !newTicker.trim()) return;
    setTickerError('');
    const tickerFormatted = newTicker.trim().toUpperCase();
    
    // Basic validation
    if (activeWL.items.some(item => item.ticker === tickerFormatted)) {
      setTickerError('Ticker already in watchlist');
      return;
    }

    try {
      await addTickerMutation.mutateAsync({
        watchlistId: activeWL.id,
        ticker: tickerFormatted
      });
      setNewTicker('');
    } catch (err) {
      setTickerError('Failed to add ticker');
    }
  };

  const handleRemoveTicker = async (ticker: string) => {
    if (!activeWL) return;
    try {
      await removeTickerMutation.mutateAsync({
        watchlistId: activeWL.id,
        ticker
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRead = async (alert: Alert) => {
    try {
      await updateAlertMutation.mutateAsync({
        alertId: alert.id,
        is_read: !alert.is_read
      });
      // Update selected alert state if open
      if (selectedAlert?.id === alert.id) {
        setSelectedAlert(prev => prev ? { ...prev, is_read: !prev.is_read } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePin = async (alert: Alert) => {
    try {
      await updateAlertMutation.mutateAsync({
        alertId: alert.id,
        is_pinned: !alert.is_pinned
      });
      if (selectedAlert?.id === alert.id) {
        setSelectedAlert(prev => prev ? { ...prev, is_pinned: !prev.is_pinned } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerMonitor = async () => {
    try {
      setTriggerSuccess(false);
      await triggerMonitorMutation.mutateAsync();
      setTriggerSuccess(true);
      setTimeout(() => setTriggerSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper for severity color class
  const getSeverityStyles = (severity: string, isRead: boolean) => {
    if (isRead) return 'border-white/[0.03] bg-white/[0.01] opacity-60';
    switch (severity) {
      case 'success':
        return 'border-green-500/20 bg-green-500/[0.02] hover:bg-green-500/[0.04]';
      case 'warning':
        return 'border-amber-500/20 bg-amber-500/[0.02] hover:bg-amber-500/[0.04]';
      case 'error':
        return 'border-red-500/20 bg-red-500/[0.02] hover:bg-red-500/[0.04]';
      default:
        return 'border-blue-500/20 bg-blue-500/[0.02] hover:bg-blue-500/[0.04]';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'success':
        return <Badge variant="favorable" className="capitalize">Positive</Badge>;
      case 'warning':
        return <Badge variant="unfavorable" className="capitalize">Risk Alert</Badge>;
      case 'error':
        return <Badge variant="unfavorable" className="capitalize">Critical</Badge>;
      default:
        return <Badge variant="brand" className="capitalize">Info</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400 font-bold" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-200 selection:bg-blue-500/30 font-sans flex flex-col">
      <TopNav />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col gap-8 animate-in fade-in duration-500">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/[0.05] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">Autonomous Monitoring Hub</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">AI Watchlists & Market Pulse</h1>
            <p className="text-sm text-slate-400 mt-1">Multi-agent systems scanning SEC filings, news sentiment, and market anomalies 24/7.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleTriggerMonitor}
              disabled={triggerMonitorMutation.isPending}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                triggerSuccess 
                ? 'bg-green-500/20 border border-green-500/40 text-green-400' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
              }`}
            >
              {triggerMonitorMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Agents Scanning...
                </>
              ) : triggerSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Alert Triggered!
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Force Agent Scan
                </>
              )}
            </button>
          </div>
        </div>

        {/* --- GRID SYSTEM --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- LEFT HAND: WATCHLIST MANAGER & MARKET PULSE (5 COLS) --- */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            
            {/* Watchlist Selection & Management */}
            <Card>
              <CardHeader className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <CardTitle className="text-md">My Watchlists</CardTitle>
                </div>
                {!isCreatingWL && (
                  <button 
                    onClick={() => setIsCreatingWL(true)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isCreatingWL && (
                  <form onSubmit={handleCreateWatchlist} className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                    <input 
                      type="text" 
                      placeholder="Watchlist Name (e.g. Clean Energy)" 
                      value={newWLName}
                      onChange={e => setNewWLName(e.target.value)}
                      className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500/50"
                      autoFocus
                    />
                    <button type="submit" className="px-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold">Create</button>
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingWL(false)} 
                      className="px-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </form>
                )}

                {loadingWL ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {watchlists?.map(wl => (
                      <div key={wl.id} className="relative group">
                        <button
                          onClick={() => {
                            setActiveWatchlistId(wl.id);
                            setTickerError('');
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            activeWL?.id === wl.id
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-bold'
                            : 'bg-white/[0.02] border-white/[0.05] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {wl.name} ({wl.items.length})
                        </button>
                        
                        {watchlists.length > 1 && (
                          <button
                            onClick={() => handleDeleteWatchlist(wl.id)}
                            className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-600 hover:bg-red-500 rounded-full text-white text-[9px] transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Ticker Management inside Active Watchlist */}
                {activeWL && (
                  <div className="border-t border-white/[0.05] pt-4 mt-2 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tickers in {activeWL.name}</span>
                    </div>

                    <form onSubmit={handleAddTicker} className="flex gap-2">
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          placeholder="Add Ticker (e.g. NVDA, AAPL)" 
                          value={newTicker}
                          onChange={e => setNewTicker(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50"
                        />
                        {tickerError && (
                          <span className="text-[10px] text-red-400 mt-1 block absolute left-1">{tickerError}</span>
                        )}
                      </div>
                      <button 
                        type="submit" 
                        disabled={addTickerMutation.isPending}
                        className="px-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-xs font-semibold flex items-center justify-center"
                      >
                        {addTickerMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </form>

                    <div className="grid grid-cols-1 gap-2 pt-2">
                      {activeWL.items.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-500">No tickers added yet. Type a ticker code to begin monitoring.</div>
                      ) : (
                        activeWL.items.map(item => (
                          <div 
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <Link 
                                href={`/company/${item.ticker}`} 
                                className="w-9 h-9 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 hover:border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-400 transition-colors"
                              >
                                {item.ticker}
                              </Link>
                              <div>
                                <Link href={`/company/${item.ticker}`} className="text-xs font-semibold hover:text-blue-400 transition-colors">
                                  {item.ticker} Corporation
                                </Link>
                                <div className="text-[10px] text-slate-500">Autonomous scan complete</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => handleRemoveTicker(item.ticker)}
                                className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Market Pulse Dashboard Widget */}
            <Card>
              <CardHeader className="py-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <CardTitle className="text-md">Market Pulse</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 1. Global Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Agent Status</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                      <span className="text-xs font-bold text-slate-200">Active</span>
                    </div>
                  </div>
                  <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Alert Volume (24h)</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs font-bold text-slate-200">
                        {alerts?.length || 0} Events
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Trending Sectors & Pulse */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Trending Sectors</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                      <span className="text-slate-400">Generative AI Platforms</span>
                      <Badge variant="favorable" className="text-[10px]">+14.2%</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                      <span className="text-slate-400">Semiconductor Hardware</span>
                      <Badge variant="favorable" className="text-[10px]">+8.5%</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                      <span className="text-slate-400">Cybersecurity Infrastructure</span>
                      <Badge variant="neutral" className="text-[10px]">+1.1%</Badge>
                    </div>
                  </div>
                </div>

                {/* 3. Upcoming Macro Calendar */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    Upcoming Catalysts
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-slate-300">PCE Price Index</span>
                        <span className="text-slate-500">Today, 08:30 AM</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">Key Federal Reserve inflation metric. Core projection is +0.2% MoM.</p>
                    </div>
                    <div className="p-2 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-slate-300">Fed Chairman Speech</span>
                        <span className="text-slate-500">Tomorrow, 11:00 AM</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">Policy guidance during economic club address. Sentiment monitoring active.</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* --- RIGHT HAND: ALERTS TIMELINE & BRIEFING (7 COLS) --- */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            
            {/* Daily Briefing Viewer */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-blue-950/20">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Sparkles className="w-36 h-36 text-blue-400" />
              </div>
              <CardHeader className="py-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <CardTitle className="text-md">AI Morning Briefing</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingBriefing ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ) : briefing ? (
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed text-xs">
                    {/* Render raw markdown line breaks cleanly */}
                    {briefing.content.split('\n').map((line, idx) => {
                      if (line.startsWith('# ')) {
                        return <h2 key={idx} className="text-lg font-bold text-white mt-4 mb-2 first:mt-0">{line.replace('# ', '')}</h2>;
                      }
                      if (line.startsWith('## ')) {
                        return <h3 key={idx} className="text-sm font-semibold text-blue-400 mt-4 mb-1.5">{line.replace('## ', '')}</h3>;
                      }
                      if (line.startsWith('* **')) {
                        // Extract list detail
                        return <div key={idx} className="pl-4 mb-1 border-l border-blue-500/20">{line.replace('* ', '')}</div>;
                      }
                      if (line.startsWith('* ')) {
                        return <li key={idx} className="ml-4 list-disc mb-1">{line.replace('* ', '')}</li>;
                      }
                      if (line.startsWith('---')) {
                        return <hr key={idx} className="border-white/[0.05] my-4" />;
                      }
                      return <p key={idx} className="mb-2">{line}</p>;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">No briefing compiled for this cycle.</div>
                )}
              </CardContent>
            </Card>

            {/* Notification Timeline (Alert Feed) */}
            <Card>
              <CardHeader className="flex justify-between items-center py-4">
                <div className="flex items-center gap-2">
                  <FileClock className="w-4 h-4 text-blue-400" />
                  <CardTitle className="text-md">AI Agent Alert Stream</CardTitle>
                </div>
                <div className="text-xs text-slate-500">
                  Refreshes automatically
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingAlerts ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : !alerts || alerts.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                    <Sparkles className="w-8 h-8 text-blue-500/30" />
                    <div>No alerts detected. Trigger an agent scan to simulate real-time news monitoring!</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map(alert => (
                      <div 
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 relative group flex gap-4 items-start ${getSeverityStyles(alert.severity, alert.is_read)}`}
                      >
                        {/* Status Icon Indicator */}
                        <div className="p-2 rounded-lg bg-white/5 border border-white/[0.05] flex-shrink-0">
                          {getSeverityIcon(alert.severity)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-blue-400">{alert.ticker}</span>
                            <span className="text-[10px] text-slate-500">•</span>
                            <span className="text-[10px] text-slate-400 font-medium">{alert.source}</span>
                            <span className="text-[10px] text-slate-500">•</span>
                            <span className="text-[10px] text-slate-500">{formatTime(alert.created_at)}</span>
                            {alert.is_pinned && (
                              <Pin className="w-3 h-3 text-blue-400 fill-blue-400/20" />
                            )}
                          </div>
                          
                          <h4 className={`text-xs font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-300 transition-colors ${alert.is_read ? 'font-medium opacity-80' : ''}`}>
                            {alert.title}
                          </h4>
                          
                          <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                            {alert.summary}
                          </p>
                        </div>

                        {/* Interactive hover actions */}
                        <div className="absolute right-3 top-3 hidden group-hover:flex items-center gap-1 bg-[#111827]/80 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/10 z-10 shadow-lg">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRead(alert);
                            }}
                            title={alert.is_read ? "Mark as unread" : "Mark as read"}
                            className="p-1 hover:text-white text-slate-400 transition-colors"
                          >
                            {alert.is_read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin(alert);
                            }}
                            title={alert.is_pinned ? "Unpin alert" : "Pin alert"}
                            className="p-1 hover:text-white text-slate-400 transition-colors"
                          >
                            <Pin className={`w-3.5 h-3.5 ${alert.is_pinned ? 'text-blue-400 fill-blue-400/20' : ''}`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

        </div>

      </main>

      {/* --- DETAILED ALERT MODAL --- */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setSelectedAlert(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          ></div>
          
          {/* Modal Container */}
          <div className="relative w-full max-w-xl bg-[#0d1424]/95 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-white/[0.05] bg-white/[0.01]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="brand">{selectedAlert.ticker}</Badge>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">{selectedAlert.source}</span>
                  {getSeverityBadge(selectedAlert.severity)}
                </div>
                <h3 className="text-md font-bold text-white mt-2 leading-snug">{selectedAlert.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              
              {/* Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Executive Summary</h4>
                <p className="text-xs text-slate-200 leading-relaxed bg-white/[0.01] border border-white/[0.03] p-3.5 rounded-xl">{selectedAlert.summary}</p>
              </div>

              {/* Why it Matters */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Why it Matters (RAG Intelligence)
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed bg-blue-900/[0.03] border border-blue-500/10 p-3.5 rounded-xl border-l-2 border-l-blue-500">{selectedAlert.why_it_matters}</p>
              </div>

              {/* Impact analysis */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Impact Score</h4>
                  <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                    <span className="text-xs font-bold text-slate-200 block">{selectedAlert.impact}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence</h4>
                  <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                    <span className="text-xs font-bold text-slate-200 block">{selectedAlert.confidence}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="flex justify-between items-center p-4 border-t border-white/[0.05] bg-white/[0.01]">
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleRead(selectedAlert)}
                  className="px-3 py-1.5 hover:bg-white/5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  {selectedAlert.is_read ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Mark Unread
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Mark Read
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleTogglePin(selectedAlert)}
                  className="px-3 py-1.5 hover:bg-white/5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Pin className={`w-3.5 h-3.5 ${selectedAlert.is_pinned ? 'text-blue-400 fill-blue-400/20' : ''}`} />
                  {selectedAlert.is_pinned ? 'Unpin Alert' : 'Pin Alert'}
                </button>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/company/${selectedAlert.ticker}`}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  onClick={() => setSelectedAlert(null)}
                >
                  Analyze Ticker
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-300 font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
