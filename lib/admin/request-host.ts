import { headers } from 'next/headers';
import { isAdminHost } from './host';

/** Server components: is this request being served on the admin subdomain? */
export async function servedOnAdminHost(): Promise<boolean> {
  const h = await headers();
  return isAdminHost(h.get('x-forwarded-host')?.split(',')[0]?.trim() || h.get('host'));
}

/** Absolute main-site URL for links out of the console (reports, dashboard). */
export function mainSiteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}
