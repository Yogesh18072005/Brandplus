import type { Metadata } from 'next';
import { HubPage } from '@/components/content/routes';

export const metadata: Metadata = {
  title: 'Who BrandPulse Is For | BrandPulse',
  description: 'How AI visibility works for SaaS startups, e-commerce brands and local businesses, and what we build for each.',
  alternates: { canonical: '/for' },
};

export default function Page() {
  return <HubPage eyebrow="Who it is for" title="Who BrandPulse is for" intro="How AI visibility works for SaaS startups, e-commerce brands and local businesses, and what we build for each." kinds={[{ kind: 'segment' }]} />;
}
