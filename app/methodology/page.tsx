import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { SiteNav } from '@/components/layout/SiteNav';
import { PageHeader } from '@/components/layout/NightPanel';

export const metadata: Metadata = {
  title: 'Methodology — BrandPulse AI Visibility Engine',
  description: 'How BrandPulse generates frozen buyer questions, observes answer engines, diagnoses evidence gaps, and produces traceable interventions.',
};

const sections = [
  ['1. Business understanding', 'Engine 01 extracts supported facts, entities, evidence, conflicts, and unknowns from the business website and supplied context. Unsupported claims stay unknown.'],
  ['2. Frozen comparison set', 'The first accepted question set is versioned and frozen. Recurring audits reuse the same core questions so before-and-after comparisons do not silently change the measurement.'],
  ['3. Supported answer engines', 'BrandPulse queries only providers marked available in the engine registry. Gemini with Google Search grounding is currently implemented. Unavailable providers are shown as unavailable and never receive simulated answers.'],
  ['4. Mentions and recommendations', 'Engine 03 preserves the answer and distinguishes a target mention, recommendation, absence, and inconclusive result. Other observed entities remain neutral unless the underlying record explicitly classifies them.'],
  ['5. Citations and sources', 'BrandPulse records URLs and domains returned as grounded citations. Citation means a source appeared with the observed answer; it does not prove that the source caused a recommendation.'],
  ['6. Observation result', 'The customer result is the actual number of meaningful appearances across the frozen buyer questions, expressed as X of Y. BrandPulse does not convert this observation into an arbitrary score.'],
  ['7. Evidence and interventions', 'Engine 04 connects observations to evidence, gaps, and bounded business implications. Engine 05 creates only interventions supported by those finalized diagnoses.'],
  ['8. Variability and limitations', 'AI answers can change because provider models, indexes, location, time and retrieval systems change. BrandPulse records timestamps, engine identity, prompt version and execution evidence so results remain auditable.'],
];

export default function MethodologyPage() {
  return (
    <>
      <SiteNav />
      <PageHeader eyebrow="Methodology" title="How observed AI visibility becomes evidence." lede="BrandPulse is open about what it measures, what it infers, and what it cannot know about private answer-engine systems." />
      <main className="mx-auto max-w-[1000px] px-4 pt-16 sm:px-6">
        <ol className="grid gap-3 sm:grid-cols-2">
          {sections.map(([title, body]) => (
            <li key={title} className="rounded-[18px] border border-rule bg-white p-6">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-content">{title}</h2>
              <p className="mt-2 text-[15px] leading-[1.7] text-secondary">{body}</p>
            </li>
          ))}
        </ol>
      </main>
      <Footer />
    </>
  );
}
