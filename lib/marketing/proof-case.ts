/**
 * The homepage proof case: a real audit, recorded from Google Gemini (with
 * Google Search) on 9 Oct 2026 — see data/outreach-reports/report-pirsch-*.json.
 * Questions, quotes, competitor names and source domains are copied exactly.
 * The audited business itself stays unnamed on the public site: we show what
 * AI said, without calling out a company that never asked to be shown.
 * Quotes are excerpts, so the UI always ends them with an ellipsis.
 */

export const PROOF_RECORDED_ON = '9 Oct 2026';
export const PROOF_ENGINE = 'Google Gemini with Google Search';
export const PROOF_SUBJECT = 'a privacy-analytics startup';
export const PROOF_CATEGORY = 'privacy-friendly website analytics';

export interface ProofQuestion {
  /** What the buyer is doing, in plain words. */
  stage: string;
  text: string;
  named: string[];
  quote: string;
}

export const PROOF_QUESTIONS: ProofQuestion[] = [
  { stage: 'Exploring', text: 'What are some good privacy-friendly website analytics tools for a small creative agency that don’t track personal data?', named: ['Plausible Analytics', 'Fathom Analytics', 'Matomo'], quote: 'Here are some highly-regarded privacy-friendly website analytics tools: Plausible Analytics is a lightweight, open-source' },
  { stage: 'Comparing', text: 'How does Plausible compare to Fathom Analytics in terms of features, ease of use, and script size?', named: ['Plausible Analytics', 'Fathom Analytics'], quote: 'Plausible Analytics and Fathom Analytics are both popular privacy-focused alternatives to traditional analytics platforms' },
  { stage: 'Checking price', text: 'Is Fathom Analytics worth the money for a small business with around 100,000 monthly pageviews, or is there a cheaper alternative?', named: ['Fathom Analytics', 'Plausible Analytics', 'Matomo'], quote: 'Fathom Analytics is a strong contender for small businesses prioritizing simplicity and privacy in their web analytics.' },
  { stage: 'Ready to buy', text: 'I need to buy a privacy-compliant analytics tool today. Which one should I sign up for if my main priority is a 2-minute setup and a clean dashboard for non-technical clients?', named: ['Plausible Analytics', 'Fathom Analytics'], quote: 'Plausible Analytics, Fathom Analytics, and Abtz Analytics appear to be the most aligned choices' },
  { stage: 'Has a problem', text: 'My site’s bounce rate is artificially high because users immediately decline our cookie consent banner. What analytics tool can help me track basic pageviews accurately without needing consent banners?', named: ['Plausible Analytics', 'Fathom Analytics', 'Matomo'], quote: 'Plausible Analytics: This is a lightweight, open-source, and privacy-friendly tool that focuses on aggregated statistics rather than individual user tracking.' },
  { stage: 'Asking who’s trusted', text: 'Which cookieless analytics platforms are currently considered the industry standard and most widely trusted by developers in the open-source community?', named: ['Matomo', 'Plausible Analytics', 'Fathom Analytics'], quote: 'platforms like Matomo, Plausible, and OpenPanel are highly regarded.' },
  { stage: 'Checking a feature', text: 'Which privacy-respecting analytics tool integrates best with Next.js and allows us to track custom event goals via an API?', named: ['Fathom Analytics', 'Plausible Analytics', 'Matomo'], quote: 'Fathom Analytics is a privacy-focused, cookie-less web analytics tool known for its clean dashboard and straightforward integration.' },
  { stage: 'Choosing a vendor', text: 'We need to self-host our web analytics on our own VPS to comply with strict EU data sovereignty laws. Which open-source tools are easiest to maintain via Docker?', named: ['Plausible Analytics', 'Matomo'], quote: 'Plausible Analytics is a lightweight, privacy-first web analytics tool that offers a simple, self-hosted solution.' },
];

/** The hero replays the buyer who was ready to buy. */
export const PROOF_HERO = {
  question: PROOF_QUESTIONS[3]!.text,
  quote: PROOF_QUESTIONS[3]!.quote,
  named: ['Plausible Analytics', 'Fathom Analytics', 'Abtz Analytics'],
  sources: ['plausible.io', 'humblytics.com', 'mitzu.io', 'abtz.co'],
};

/** Answers (of 8) that named each business. */
export const PROOF_TALLY = [
  { name: 'Plausible Analytics', answers: 8 },
  { name: 'Fathom Analytics', answers: 7 },
  { name: 'Matomo', answers: 6 },
  { name: 'The startup we audited', answers: 0, subject: true },
];

/** Websites Gemini read most often across the 8 answers (count of answers). */
export const PROOF_SOURCES = [
  { domain: 'plausible.io', answers: 4 },
  { domain: 'usefathom.com', answers: 4 },
  { domain: 'posthog.com', answers: 4 },
  { domain: 'openpanel.dev', answers: 4 },
  { domain: 'swetrix.com', answers: 4 },
  { domain: 'matomo.org', answers: 3 },
  { domain: 'humblytics.com', answers: 3 },
];
