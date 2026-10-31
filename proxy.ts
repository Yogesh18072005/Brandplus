import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { adminOrigin, routeAdminRequest } from '@/lib/admin/host';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/account(.*)',
  '/api/audits(.*)',
  '/api/projects(.*)',
  '/api/billing(.*)',
  '/api/onboarding(.*)',
  '/api/tools(.*)',
  '/api/talk(.*)',
]);

const isPublicWebhookRoute = createRouteMatcher([
  '/api/webhooks/clerk',
  '/api/billing/verify',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isLegacyOpsRoute = createRouteMatcher(['/dashboard/ops(.*)']);
const isAdminSignInRoute = createRouteMatcher(['/admin/sign-in(.*)']);
const isClerkAdminApiRoute = createRouteMatcher([
  '/api/admin/audits(.*)',
  '/api/admin/queue(.*)',
]);

const configuredAppOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : undefined;
  } catch {
    return undefined;
  }
})();

// Clerk does not support Frontend API proxying for development instances.
// Enable this only after a production domain and matching Clerk proxy config exist.
const clerkFrontendProxyEnabled =
  process.env.CLERK_FRONTEND_API_PROXY_ENABLED === 'true' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') === true &&
  process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') === true;

// The admin console is served from its own subdomain (NEXT_PUBLIC_ADMIN_URL), so
// Clerk must accept session tokens issued for that origin too.
const configuredAdminOrigin = adminOrigin();
// In development the server may run on another port than NEXT_PUBLIC_APP_URL
// (.claude/launch.json starts `dev` on 3001). Without these, Clerk rejects the
// session ("Invalid JWT Authorized party claim") and loops on every protected page.
const localDevOrigins = process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
const authorizedOrigins = [...new Set([configuredAppOrigin, configuredAdminOrigin, ...localDevOrigins].filter((origin): origin is string => Boolean(origin)))];

export default clerkMiddleware(
  async (auth, request) => {
    const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
    const adminRouting = routeAdminRequest(request.nextUrl, host, { adminOrigin: configuredAdminOrigin, appOrigin: configuredAppOrigin ?? null });
    if (adminRouting.kind === 'redirect') return NextResponse.redirect(adminRouting.url);
    if (adminRouting.kind === 'rewrite') {
      // Signed-out visitors to the console go to its sign-in page; the page itself
      // still verifies the ADMIN_EMAILS allowlist.
      if (adminRouting.pathname === '/admin') {
        const { userId } = await auth();
        // Build from the visitor's host: request.url can carry the internal server address.
        if (!userId) return NextResponse.redirect(`${request.nextUrl.protocol}//${host}/sign-in`);
      }
      const rewritten = request.nextUrl.clone();
      rewritten.pathname = adminRouting.pathname;
      return NextResponse.rewrite(rewritten);
    }

    if (isLegacyOpsRoute(request)) return NextResponse.redirect(new URL('/admin', request.url));
    if (isProtectedRoute(request) && !isPublicWebhookRoute(request)) await auth.protect();
    if (isClerkAdminApiRoute(request)) await auth.protect();
    if (isAdminRoute(request) && !isAdminSignInRoute(request)) {
      const { userId } = await auth();
      if (!userId) return NextResponse.redirect(new URL('/admin/sign-in', request.url));
    }
  },
  {
    authorizedParties: authorizedOrigins.length ? authorizedOrigins : undefined,
    frontendApiProxy: {
      enabled: clerkFrontendProxyEnabled,
      path: '/__clerk',
    },
    contentSecurityPolicy: {
      strict: true,
      directives: {
        'script-src': ['https://checkout.razorpay.com', 'https://*.razorpay.com'],
        'connect-src': ['https://*.razorpay.com'],
        'frame-src': ['https://*.razorpay.com'],
        'img-src': ['data:', 'blob:', 'https://*.razorpay.com'],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
      },
    },
  },
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
