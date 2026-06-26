import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../lib/apiConfig';

export interface WatchlistItem {
  id: number;
  ticker: string;
  watchlist_id: number;
}

export interface Watchlist {
  id: number;
  name: string;
  user_id: number;
  items: WatchlistItem[];
}

export interface Alert {
  id: number;
  ticker: string;
  title: string;
  summary: string;
  why_it_matters: string;
  impact: string;
  confidence: string;
  source: string;
  severity: 'success' | 'warning' | 'info' | 'error';
  is_read: boolean;
  is_pinned: boolean;
  created_at: string;
}

export interface DailyBriefing {
  id: number;
  content: string;
  created_at: string;
}

export function useWatchlists() {
  return useQuery<Watchlist[]>({
    queryKey: ['watchlists'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/watchlists`);
      if (!res.ok) throw new Error('Failed to fetch watchlists');
      return res.json();
    },
  });
}

export function useCreateWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${API_BASE}/watchlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to create watchlist');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
  });
}

export function useDeleteWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/watchlists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete watchlist');
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
  });
}

export function useAddTicker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ watchlistId, ticker }: { watchlistId: number; ticker: string }) => {
      const res = await fetch(`${API_BASE}/watchlists/${watchlistId}/tickers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) throw new Error('Failed to add ticker');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useRemoveTicker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ watchlistId, ticker }: { watchlistId: number; ticker: string }) => {
      const res = await fetch(`${API_BASE}/watchlists/${watchlistId}/tickers/${ticker}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove ticker');
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
  });
}

export function useAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/alerts`);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
    refetchInterval: 10_000,
  });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      alertId,
      is_read,
      is_pinned,
    }: {
      alertId: number;
      is_read?: boolean;
      is_pinned?: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read, is_pinned }),
      });
      if (!res.ok) throw new Error('Failed to update alert');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useDailyBriefing() {
  return useQuery<DailyBriefing>({
    queryKey: ['daily-briefing'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/briefing`);
      if (!res.ok) throw new Error('Failed to fetch briefing');
      return res.json();
    },
  });
}

export function useTriggerMonitoring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/monitor/trigger`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to trigger monitoring');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['daily-briefing'] });
    },
  });
}
