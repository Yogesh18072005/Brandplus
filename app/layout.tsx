import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { IBM_Plex_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import './nav.css';
import './clarity.css';
import './signal.css';
import './story.css';
import './iso.css';
import './home.css';
import './hero.css';
import './report.css';
import './report-overrides.css';
import './workspace.css';
import './simple-report.css';
import './audit-report.css';
import { getAppUrl } from '@/lib/app-url';

// Inter, self-hosted (rsms/inter v4.1 variable fonts in app/fonts), used for all text.
const inter = localFont({
  src: [
    { path: './fonts/InterVariable.woff2', style: 'normal', weight: '100 900' },
    { path: './fonts/InterVariable-Italic.woff2', style: 'italic', weight: '100 900' },
  ],
  variable: '--font-inter',
  display: 'swap',
});
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plexmono', display: 'swap' });
const clerkFrontendProxyEnabled =
  process.env.CLERK_FRONTEND_API_PROXY_ENABLED === 'true' &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') === true &&
  process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') === true;

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: 'BrandPulse - Get your business recommended by AI',
  description: 'See who AI recommends instead of you, with every answer quoted. Then we write and publish what changes the answer. Start with a free audit.',
  openGraph: {
    title: 'BrandPulse - Get your business recommended by AI',
    description: 'A free audit of who AI recommends instead of you, then done-for-you pages, listings and monthly re-checks.',
    siteName: 'BrandPulse',
    type: 'website',
    locale: 'en_IN',
    images: ['/sample-report-headline.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BrandPulse - Get your business recommended by AI',
    description: 'Free audit: who AI names instead of you, quoted word for word. Then we fix it.',
    images: ['/sample-report-headline.png'],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ProfessionalService',
              '@id': `${getAppUrl()}/#organization`,
              name: 'BrandPulse',
              logo: `${getAppUrl()}/icon.svg`,
              image: `${getAppUrl()}/sample-report-headline.png`,
              areaServed: 'Worldwide',
              knowsAbout: ['Answer engine optimization', 'Generative engine optimization', 'AI search visibility', 'Search engine optimization'],
              description: 'Done-for-you AI visibility: audits of how AI assistants answer buyer questions, then pages, listings and monthly re-checks that change the answer.',
              url: getAppUrl(),
              offers: [
                { '@type': 'Offer', name: 'Free AI visibility audit', price: '0', priceCurrency: 'INR' },
              ],
              publisher: { '@type': 'Organization', name: 'BrandPulse' },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ClerkProvider
          dynamic
          proxyUrl={clerkFrontendProxyEnabled ? '/__clerk' : undefined}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInForceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard/onboarding"
        >
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('js')` }} />
          <a href="#main-content" className="skip-link">Skip to content</a>
          <div id="main-content">{children}</div>
        </ClerkProvider>
      </body>
    </html>
  );
}
