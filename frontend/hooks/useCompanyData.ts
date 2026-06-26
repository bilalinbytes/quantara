import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../lib/apiConfig';

export function useCompanyProfile(ticker: string) {
  return useQuery({
    queryKey: ['company', ticker, 'profile'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/companies/${ticker}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    enabled: !!ticker,
  });
}

export function useCompanyPrice(ticker: string) {
  return useQuery({
    queryKey: ['company', ticker, 'price'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/price`);
      if (!res.ok) throw new Error('Failed to fetch price');
      return res.json();
    },
    enabled: !!ticker,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 15000,
  });
}

export function useCompanyMetrics(ticker: string) {
  return useQuery({
    queryKey: ['company', ticker, 'metrics'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/metrics`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    enabled: !!ticker,
  });
}

export function useCompanyHistory(ticker: string, range: string = '1Y') {
  return useQuery({
    queryKey: ['company', ticker, 'history', range],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/history?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    enabled: !!ticker,
  });
}

export function useCompanyAI(ticker: string) {
  return useQuery({
    queryKey: ['company', ticker, 'ai-summary'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/ai-summary`);
      if (!res.ok) throw new Error('Failed to fetch AI summary');
      return res.json();
    },
    enabled: !!ticker,
  });
}

export function useCompanySearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to search');
      return res.json();
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
