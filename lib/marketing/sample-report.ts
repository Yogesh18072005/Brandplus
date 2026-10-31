import type { SimpleReport } from '@/lib/reports/simple-report';
import { PROOF_ENGINE, PROOF_QUESTIONS, PROOF_SOURCES, PROOF_TALLY } from '@/lib/marketing/proof-case';

/**
 * A real report, shown to prospects before they hand over anything. Built
 * from the 9 Oct 2026 audit (lib/marketing/proof-case.ts); the business stays
 * unnamed, every question, quote, rival and source is as recorded.
 */
export const SAMPLE_REPORT: SimpleReport = {
  reportId: 'sample',
  projectId: 'sample',
  businessName: 'The startup we audited',
  website: '',
  observedOn: '2026-10-09T09:00:00Z',
  engineLabel: PROOF_ENGINE,
  total: PROOF_QUESTIONS.length,
  recommended: 0,
  mentioned: 0,
  missed: PROOF_QUESTIONS.length,
  unclear: 0,
  headline: 'AI named its competitors in every answer, and never named it.',
  questions: PROOF_QUESTIONS.map((q, i) => ({ id: `q${i}`, question: q.text, verdict: 'missed', quote: `${q.quote.replace(/[.\s]+$/, '')}…`, competitorsNamed: q.named })),
  competitors: PROOF_TALLY.filter((t) => !t.subject).map((t) => ({ name: t.name, answers: t.answers })),
  sources: PROOF_SOURCES.map((s) => ({ domain: s.domain, answers: s.answers, isYou: false })),
  gaps: PROOF_QUESTIONS.length,
  fixCount: 0,
};

