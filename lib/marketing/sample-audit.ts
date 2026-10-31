/**
 * Industry-neutral product-preview data used across the marketing UI.
 *
 * This data is intentionally illustrative. It demonstrates the shape of an
 * BrandPulse workspace without making the product feel built for one company,
 * category, or country. Customer reports always use their own recorded data.
 */
export const SAMPLE_AUDIT = {
  reportUrl: '/#proof',
  business: {
    name: 'Your brand',
    category: 'your category',
    city: 'your market',
    website: 'yourdomain.com',
  },
  auditDate: 'Illustrative workspace',
  promptCount: 40,
  answeredCount: 40,
  mentionedCount: 11,
  visibilityScore: 28,
  presenceRate: 0.28,
  shareOfVoice: 0.19,
  topCompetitor: { name: 'Category leader', mentionedCount: 24, presenceRate: 0.6 },
  competitors: [
    { name: 'Category leader', presenceRate: 0.6, bar: 60 },
    { name: 'Closest rival', presenceRate: 0.45, bar: 45 },
    { name: 'New entrant', presenceRate: 0.35, bar: 35 },
  ],
  heroQuestion: 'which provider in [your category] should I choose?',
  shortlist: [
    { rank: 1, name: 'Category leader', detail: 'Appears most often across high-intent buyer questions.' },
    { rank: 2, name: 'Closest rival', detail: 'Wins comparison and best-for questions.' },
    { rank: 3, name: 'New entrant', detail: 'Gaining visibility through focused answer pages.' },
  ],
  sampleQuotes: [
    {
      question: 'Which provider in [your category] is best for a growing team?',
      excerpt:
        'The strongest options are the category leader for broad coverage and the closest rival for specialist support…',
      highlight: 'the category leader',
    },
    {
      question: 'Compare the top providers by price, support, and reliability.',
      excerpt:
        'Buyers should compare onboarding time, proof of results, support access, and total cost before choosing…',
      highlight: '',
    },
  ],
  missedPrompts: [
    {
      prompt: 'Which provider in [your category] is best for a growing team?',
      competitors: ['Category leader', 'Closest rival', 'New entrant'],
      evidence: 'The answer recommends three alternatives, but your brand is not included.',
    },
    {
      prompt: 'What should I look for when choosing a [your category] provider?',
      competitors: ['Category leader', 'Closest rival'],
      evidence: 'Competitors are cited for clearer proof, comparison content, and third-party authority.',
    },
    {
      prompt: 'Compare the top providers by price, support, and reliability.',
      competitors: ['Category leader', 'New entrant'],
      evidence: 'The response includes competitor evidence and omits your existing offer pages.',
    },
  ],
  fixPlanPreview: [
    {
      effort: 'easy',
      impact: 'high',
      title: 'Publish a buyer-facing comparison page',
      why: 'Comparison questions create the largest visibility gap in this preview.',
      locked: false,
    },
    {
      effort: 'easy',
      impact: 'high',
      title: 'Strengthen your trusted third-party profiles',
      why: 'AI answers rely on external proof when deciding which brands to name.',
      locked: false,
    },
    {
      effort: 'medium',
      impact: 'high',
      title: 'Turn missed questions into answer-ready pages',
      why: 'Each brief maps a missed buyer question to the evidence and entities it needs.',
      locked: true,
    },
  ],
  industries: ['SaaS', 'Agencies', 'Healthcare', 'Professional services', 'Local businesses'],
} as const;

export type SampleAudit = typeof SAMPLE_AUDIT;
