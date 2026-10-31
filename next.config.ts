import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig: NextConfig = {
  // Engine code (src/) stays server-side only. Nothing engine-related may
  // ever be imported into a client component — keys are server-side (§7).
  turbopack: { root: __dirname },
  // Report pages read committed JSON at runtime; make sure it ships in the server bundle.
  outputFileTracingIncludes: {
    '/r/*': ['./lib/outreach-reports/**/*.json', './lib/sample-reports/**/*.json'],
  },
  poweredByHeader: false,
  devIndicators: false,
  // Agency positioning: no public price list. Temporary (307) so the old
  // self-serve pricing page can come back without cached redirects.
  async redirects() {
    return [{ source: '/pricing', destination: '/sprint', permanent: false }];
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
