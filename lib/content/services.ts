import type { Doc, DocSection } from './types';

const D = '2026-10-12';

const pricing: DocSection = {
  heading: 'How is it priced?',
  answer:
    'The audit is free. Ongoing work is one fixed monthly price agreed on a call, based on how many buyer questions you are missing and how entrenched your competitors are, with a three-month minimum.',
};

const honesty: DocSection = {
  heading: 'What we will not do',
  body: [{ ul: [
    'Promise guaranteed rankings or guaranteed AI mentions. AI answers vary; we measure and re-check instead.',
    'Create fake reviews, fake accounts or mass-produced pages.',
    'Publish anything without your approval.',
  ] }],
};

export const services: Doc[] = [
  {
    kind: 'service',
    slug: 'ai-visibility-audit',
    title: 'Free AI Visibility Audit',
    description: 'See which buyer questions AI answers with your competitors instead of you, with every answer quoted word for word and the sources it cited.',
    h1: 'AI visibility audit',
    answer:
      'The BrandPulse AI visibility audit asks the questions your buyers ask AI, records every answer word for word, and shows how often you are mentioned or recommended compared with your competitors, which questions you are missing, and which sources the AI cited. It is free and is the starting point for everything else we do.',
    sections: [
      {
        heading: 'What the audit measures',
        body: [{ table: { head: ['Measure', 'What it tells you'], rows: [
          ['Appearances', 'How many of the buyer questions mention you, as X of Y'],
          ['Competitors named', 'Who AI names instead of you, and how often'],
          ['Missed questions', 'High-value questions where competitors appear and you do not, with the quote'],
          ['Cited sources', 'The domains AI relied on: your off-site target list'],
          ['Site checks', 'Whether AI crawlers can read your site'],
        ] } }],
      },
      {
        heading: 'Which AI engines does it cover?',
        answer: 'The audit records Google\'s Gemini answers grounded with live Google Search, which can be re-run exactly. We also check your most important questions in ChatGPT and include what we find.',
        body: [{ p: 'Full detail is in our [methodology](/methodology).' }],
      },
      {
        heading: 'How it works',
        body: [{ ol: [
          'You enter your website and market.',
          'We generate realistic buyer questions for your category and review them.',
          'We run them, record each answer and its cited sources.',
          'You get a report with the evidence and the first fixes.',
        ] }],
      },
    ],
    faqs: [
      ['Is the audit really free?', 'Yes. There is no charge for the audit.'],
      ['Can I trust a single run?', 'AI answers vary between runs, so we report what was observed with timestamps and re-check the same questions over time rather than presenting one run as permanent truth.'],
    ],
    related: ['/guides/why-ai-recommends-your-competitor', '/glossary/presence-rate', '/glossary/citation-gap'],
    published: D,
    updated: D,
  },
  {
    kind: 'service',
    slug: 'answer-engine-optimization',
    title: 'Answer Engine Optimization (AEO) Service',
    description: 'Done-for-you AEO: we write and publish the answer pages, comparisons and fixes that make your content the answer AI shows.',
    h1: 'Answer engine optimization (AEO) service',
    answer:
      'Our AEO service turns the questions you are missing in AI answers into pages written to be quoted: answer-first service pages, cost guides, comparison and alternatives pages, plus the technical fixes that let AI crawlers read them. You approve everything before it goes live, and we re-check the same questions monthly.',
    sections: [
      {
        heading: 'What is included',
        body: [{ ul: [
          'Answer pages built around the exact questions from your audit',
          'Comparison and alternatives pages for the competitors AI named',
          'Technical fixes: crawler access, server-rendered content, structured data',
          'Monthly re-check of the same questions',
        ] }],
      },
      pricing,
      honesty,
    ],
    related: ['/guides/answer-engine-optimization', '/services/generative-engine-optimization', '/compare/aeo-vs-seo'],
    published: D,
    updated: D,
  },
  {
    kind: 'service',
    slug: 'generative-engine-optimization',
    title: 'Generative Engine Optimization (GEO) Service',
    description: 'Done-for-you GEO: pages, listings, reviews and outreach that raise how often ChatGPT, Gemini and Google AI recommend your brand.',
    h1: 'Generative engine optimization (GEO) service',
    answer:
      'Our GEO service works on both halves of AI recommendations: the pages on your site that engines retrieve and quote, and the third-party sources they trust, such as review sites, directories and roundup articles. We start from the evidence in your audit, fix the biggest gaps first, and re-check monthly.',
    sections: [
      {
        heading: 'What is included',
        body: [{ ul: [
          'Answer, comparison and alternatives pages written to be quotable',
          'Profiles completed on the directories and review sites AI cited',
          'A plan for collecting real reviews',
          'Outreach to the authors of roundup articles AI relies on',
          'Video scripts for key buyer questions (you record, AI reads the transcripts)',
          'Monthly re-check report',
        ] }],
      },
      pricing,
      honesty,
    ],
    related: ['/guides/generative-engine-optimization', '/compare/geo-vs-seo', '/guides/get-listed-in-best-of-articles'],
    published: D,
    updated: D,
  },
  {
    kind: 'service',
    slug: 'chatgpt-visibility',
    title: 'ChatGPT Visibility: Get Recommended in ChatGPT',
    description: 'Find out whether ChatGPT recommends your brand, and fix the pages, crawler access and third-party sources behind its answers.',
    h1: 'ChatGPT visibility',
    answer:
      'We check your most important buyer questions in ChatGPT, record who it recommends and which sources it cites, and then fix what is behind the answer: OpenAI crawler access, pages for the questions you are missing, and presence on the sources ChatGPT leans on, such as review sites, roundups and community discussions.',
    sections: [
      {
        heading: 'How we measure ChatGPT',
        answer: 'Our repeatable audit runs on Gemini with Google Search. For ChatGPT we check your most important questions directly and include the answers in your report. We are clear about which results come from which engine.',
      },
      {
        heading: 'What we fix',
        body: [{ ul: [
          'OAI-SearchBot and ChatGPT-User access through robots.txt and your firewall',
          'Content readable without JavaScript',
          'Product, pricing, comparison and alternatives pages',
          'Review-site presence and roundup outreach',
        ] }],
      },
      pricing,
      honesty,
    ],
    related: ['/guides/how-to-rank-in-chatgpt', '/glossary/oai-searchbot', '/services/generative-engine-optimization'],
    published: D,
    updated: D,
  },
  {
    kind: 'service',
    slug: 'google-ai-overviews-optimization',
    title: 'Google AI Overviews and AI Mode Optimization',
    description: 'Get your pages cited in Google AI Overviews and AI Mode: indexing, answer-first pages and coverage of the follow-up questions Google fans out to.',
    h1: 'Google AI Overviews and AI Mode optimization',
    answer:
      'Google cites pages in AI Overviews and AI Mode that are indexed, snippet-eligible and clearly answer one of the questions its query fan-out searches for. We fix indexing and snippet blockers, restructure your key pages so each section answers a real buyer question, and build pages for the follow-up questions you are missing.',
    sections: [
      {
        heading: 'What is included',
        body: [{ ul: [
          'Indexing and snippet-control review (noindex, nosnippet, canonicals)',
          'Answer-first restructuring of your money pages',
          'New pages for the follow-up questions your audit shows you missing',
          'Business Profile and Merchant Center checks where relevant',
          'Monthly re-check on Gemini with Google Search',
        ] }],
      },
      pricing,
      honesty,
    ],
    related: ['/guides/google-ai-overviews', '/glossary/ai-overviews', '/glossary/query-fan-out'],
    published: D,
    updated: D,
  },
  {
    kind: 'service',
    slug: 'ai-agent-readiness',
    title: 'AI Agent Readiness Review',
    description: 'Make your business easy for AI agents to verify and act on: readable prices and policies, agent-friendly forms and complete product feeds.',
    h1: 'AI agent readiness',
    answer:
      'AI agents book, buy and compare on people\'s behalf, and they skip businesses whose prices, availability or policies they cannot read. Our agent readiness review checks your site against the levels agents need, from readable to transactable, and fixes the gaps as part of the done-for-you work.',
    sections: [
      {
        heading: 'What we check',
        body: [{ ul: [
          'Prices or ranges, hours, location and policies in server-rendered HTML',
          'Structured data that matches the page',
          'Forms with labeled fields and booking without forced login',
          'AI user agents not blocked by your firewall',
          'Product feeds for e-commerce (Google Merchant Center, OpenAI product feed where eligible)',
        ] }],
      },
      pricing,
    ],
    related: ['/guides/assistive-agent-optimization', '/glossary/agentic-commerce', '/for/ecommerce-brands'],
    published: D,
    updated: D,
  },
];
