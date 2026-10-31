import type { Metadata } from 'next';
import { HubPage } from '@/components/content/routes';

export const metadata: Metadata = {
  title: 'Guides to AEO, GEO and AI Visibility | BrandPulse',
  description: 'Practical guides to getting your business found, cited and recommended by Google, ChatGPT, Gemini, Perplexity and AI agents.',
  alternates: { canonical: '/guides' },
};

export default function Page() {
  return <HubPage eyebrow="Guides" title="Guides to AI visibility" intro="Practical guides to getting your business found, cited and recommended by Google, ChatGPT, Gemini, Perplexity and AI agents." kinds={[{ kind: 'guide' }]} />;
}
