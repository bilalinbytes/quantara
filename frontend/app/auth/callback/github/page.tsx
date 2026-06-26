'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { API_BASE } from '../../../../lib/apiConfig';

export default function GitHubOAuthCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setError('Missing authorization code');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/oauth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, provider: 'github' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'OAuth failed');
        localStorage.setItem('quantara_access_token', data.access_token);
        localStorage.setItem('quantara_refresh_token', data.refresh_token);
        router.replace('/');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'OAuth failed');
      }
    })();
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a] text-white">
      {error ? <p className="text-rose-400">{error}</p> : <p>Completing GitHub sign-in…</p>}
    </div>
  );
}
