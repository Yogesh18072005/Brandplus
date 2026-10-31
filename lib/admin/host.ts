// Admin console host routing. The console's code lives under /admin, but in
// production it is served from its own subdomain (admin.zerociate.com) with
// clean paths: "/" is the console and "/sign-in" is its sign-in page.
// Pure functions so the proxy and the tests share one implementation.

const ADMIN_PREFIX = '/admin';

/** True for admin.zerociate.com, admin.localhost:3001 and similar hosts. */
export function isAdminHost(host: string | null | undefined): boolean {
  return /^admin\./i.test(host?.trim() ?? '');
}

/** Origin of the dedicated admin host (NEXT_PUBLIC_ADMIN_URL), or null when not configured. */
export function adminOrigin(value: string | undefined = process.env.NEXT_PUBLIC_ADMIN_URL): string | null {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

/** Link inside the console: "/" and "/sign-in" on the admin host, "/admin…" elsewhere. */
export function adminHref(path: '/' | '/sign-in', onAdminHost: boolean): string {
  if (onAdminHost) return path;
  return path === '/' ? ADMIN_PREFIX : `${ADMIN_PREFIX}${path}`;
}

export type AdminRouting =
  | { kind: 'pass' }
  | { kind: 'rewrite'; pathname: string }
  | { kind: 'redirect'; url: string };

const stripAdminPrefix = (pathname: string) => pathname.slice(ADMIN_PREFIX.length) || '/';
const isAdminPath = (pathname: string) => pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);

/**
 * Decide how one request is routed.
 * - On the admin host: "/" and "/sign-in…" are served by the /admin pages;
 *   "/admin…" redirects to its clean path; any other page goes to the main site.
 * - On the main host: "/admin…" redirects to the admin host when one is configured.
 * API, Next.js and Clerk proxy paths always pass through untouched.
 */
export function routeAdminRequest(
  url: URL,
  host: string | null,
  options: { adminOrigin: string | null; appOrigin: string | null },
): AdminRouting {
  const { pathname, search } = url;
  if (/^\/(api|_next|__clerk)(\/|$)/.test(pathname)) return { kind: 'pass' };

  if (isAdminHost(host)) {
    const origin = `${url.protocol}//${host}`;
    if (isAdminPath(pathname)) return { kind: 'redirect', url: `${origin}${stripAdminPrefix(pathname)}${search}` };
    if (pathname === '/' || pathname === '/sign-in' || pathname.startsWith('/sign-in/')) {
      return { kind: 'rewrite', pathname: pathname === '/' ? ADMIN_PREFIX : `${ADMIN_PREFIX}${pathname}` };
    }
    return options.appOrigin ? { kind: 'redirect', url: `${options.appOrigin}${pathname}${search}` } : { kind: 'pass' };
  }

  if (options.adminOrigin && isAdminPath(pathname) && new URL(options.adminOrigin).host !== host) {
    return { kind: 'redirect', url: `${options.adminOrigin}${stripAdminPrefix(pathname)}${search}` };
  }
  return { kind: 'pass' };
}
