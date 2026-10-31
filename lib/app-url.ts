/**
 * Canonical production URL for links in emails and auth redirects.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (set this on Vercel to your real domain)
 * 2. VERCEL_URL (auto on Vercel deploys — https://your-app.vercel.app)
 * 3. localhost (local dev only)
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Server-side app URL (emails, API). */
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return stripTrailingSlash(fromEnv);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

/** Client-side app URL (auth redirects in browser). */
export function getClientAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return stripTrailingSlash(fromEnv);

  if (typeof window !== 'undefined') return window.location.origin;

  return 'http://localhost:3000';
}

/** Supabase auth callback — must match Supabase Dashboard → Auth → URL Configuration. */
export function authCallbackUrl(next = '/dashboard'): string {
  return `${getClientAppUrl()}/callback?next=${encodeURIComponent(next)}`;
}
