import type { Metadata } from 'next';
import { HubPage } from '@/components/content/routes';

export const metadata: Metadata = {
  title: 'AI Visibility Services | BrandPulse',
  description: 'Audits and done-for-you work that raise how often AI recommends your business: AEO, GEO, ChatGPT, Google AI Overviews and agent readiness.',
  alternates: { canonical: '/services' },
};

export default function Page() {
  return <HubPage eyebrow="Services" title="AI visibility services" intro="Audits and done-for-you work that raise how often AI recommends your business: AEO, GEO, ChatGPT, Google AI Overviews and agent readiness." kinds={[{ kind: 'service' }]} />;
}
