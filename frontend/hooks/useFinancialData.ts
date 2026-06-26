import { useQuery, useMutation } from '@tanstack/react-query';
import { API_BASE } from '../lib/apiConfig';

export function useCompanyFinancials(ticker: string) {
  return useQuery({
    queryKey: ['company', ticker, 'financials'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/financials`);
      if (!res.ok) throw new Error('Failed to fetch financials');
      return res.json();
    },
    enabled: !!ticker,
  });
}

export function useAIFinancialAnalysis() {
  return useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch(`${API_BASE}/companies/${ticker}/financial-analysis`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to generate AI analysis');
      return res.json();
    },
  });
}
