import type { Metadata } from 'next';
import { HubPage } from '@/components/content/routes';

export const metadata: Metadata = {
  title: 'Comparisons | BrandPulse',
  description: 'Side-by-side comparisons of AI search approaches, so you can choose what fits your business.',
  alternates: { canonical: '/compare' },
};

export default function Page() {
  return <HubPage eyebrow="Comparisons" title="Comparisons" intro="Side-by-side comparisons of AI search approaches, so you can choose what fits your business." kinds={[{ kind: 'compare' }]} />;
}
