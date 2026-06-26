import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../lib/apiConfig';

export function useFilingsList(ticker: string) {
  return useQuery({
    queryKey: ['filings', ticker],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/filings`);
      if (!res.ok) throw new Error('Failed to fetch filings');
      return res.json();
    },
    enabled: !!ticker,
  });
}

export function useParsedFiling(ticker: string, filingId: string | null) {
  return useQuery({
    queryKey: ['filings', ticker, filingId],
    queryFn: async () => {
      if (!filingId) return null;
      const res = await fetch(`${API_BASE}/companies/${ticker}/filings/${filingId}`);
      if (!res.ok) throw new Error('Failed to fetch parsed filing');
      return res.json();
    },
    enabled: !!filingId && !!ticker,
  });
}
