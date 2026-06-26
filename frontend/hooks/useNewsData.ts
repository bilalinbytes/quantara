import { useQuery, useMutation } from '@tanstack/react-query';
import { API_BASE } from '../lib/apiConfig';

export function useCompanyNews(ticker: string) {
  return useQuery({
    queryKey: ['news', ticker],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/news`);
      if (!res.ok) throw new Error('Failed to fetch news');
      return res.json();
    },
    enabled: !!ticker,
  });
}

export function useCompanySentiment(ticker: string) {
  return useQuery({
    queryKey: ['sentiment', ticker],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/sentiment`);
      if (!res.ok) throw new Error('Failed to fetch sentiment');
      return res.json();
    },
    enabled: !!ticker,
  });
}

export function useAnalyzeCompanyNews() {
  return useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/news/analyze`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to analyze news');
      return res.json();
    },
  });
}

export function useCompanyChat() {
  return useMutation({
    mutationFn: async ({
      ticker,
      question,
      session_id,
    }: {
      ticker: string;
      question: string;
      session_id?: number | null;
    }) => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, session_id: session_id ?? null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Chat request failed' }));
        throw new Error(err.detail || 'Chat request failed');
      }
      return res.json();
    },
  });
}
