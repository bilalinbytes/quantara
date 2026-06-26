// Central API base — respects NEXT_PUBLIC_API_URL for Docker, falls back to localhost for local dev
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
