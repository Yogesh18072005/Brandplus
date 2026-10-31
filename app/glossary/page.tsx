import type { Metadata } from 'next';
import { HubPage } from '@/components/content/routes';

export const metadata: Metadata = {
  title: 'AI Search Glossary | BrandPulse',
  description: 'Plain definitions of the terms used in AI search, answer engine optimization and generative engine optimization.',
  alternates: { canonical: '/glossary' },
};

export default function Page() {
  return <HubPage eyebrow="Glossary" title="AI search glossary" intro="Plain definitions of the terms used in AI search, answer engine optimization and generative engine optimization." kinds={[{ kind: 'glossary' }]} />;
}
