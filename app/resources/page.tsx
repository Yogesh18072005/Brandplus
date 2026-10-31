import type { Metadata } from 'next';
import { HubPage } from '@/components/content/routes';

export const metadata: Metadata = {
  title: 'Resources: AI Visibility, AEO and GEO | BrandPulse',
  description: 'Guides, comparisons and definitions for getting a business found, cited and recommended by search engines, AI assistants and AI agents.',
  alternates: { canonical: '/resources' },
};

export default function ResourcesPage() {
  return (
    <HubPage
      eyebrow="Resources"
      title="How AI decides who to recommend, and what to do about it."
      intro="Guides, comparisons and definitions for getting a business found, cited and recommended by search engines, AI assistants and AI agents. Written from what we measure in real AI answers."
      kinds={[
        { kind: 'guide', heading: 'Guides' },
        { kind: 'compare', heading: 'Comparisons' },
        { kind: 'service', heading: 'Services' },
        { kind: 'segment', heading: 'Who it is for' },
        { kind: 'glossary', heading: 'Glossary' },
      ]}
    />
  );
}
