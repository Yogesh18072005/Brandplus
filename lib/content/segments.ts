import type { Doc } from './types';

const D = '2026-10-12';

const howWeWork = {
  heading: 'How BrandPulse works with you',
  answer: 'Free audit first, then a scope for your company, then we write and you approve, then monthly re-checks of the same questions.',
  body: [{ p: 'The audit records Google\'s Gemini answers with live Google Search, which can be re-run exactly, and we check your most important questions in ChatGPT. Details on the [done-for-you page](/sprint) and in our [methodology](/methodology).' }],
};

export const segments: Doc[] = [
  {
    kind: 'segment',
    slug: 'saas-startups',
    title: 'AI Visibility for SaaS Startups',
    description: 'Get your SaaS product recommended when buyers ask ChatGPT and Gemini for tools in your category. Audit, pages, listings and monthly re-checks.',
    h1: 'AI visibility for SaaS startups',
    answer:
      'When a buyer asks an AI assistant for the best tool in your category, it names a few products. BrandPulse finds the questions where it names competitors instead of you, then builds what changes the answer: comparison and alternatives pages, use-case pages, review-site profiles, and inclusion in the lists AI reads. Every month we re-check the same questions.',
    sections: [
      {
        heading: 'Why AI skips early-stage SaaS',
        answer: 'New products usually lack the comparison pages, review-site presence and third-party mentions that AI engines lean on, even when the product is better.',
        body: [{ ul: [
          'No "you vs incumbent" or "incumbent alternatives" page for the engine to retrieve',
          'Few or no reviews on G2, Capterra or Product Hunt',
          'Absent from the "best [category] tools" articles AI cites',
          'Pricing and key features hidden behind a demo request',
        ] }],
      },
      {
        heading: 'What we build for SaaS',
        body: [{ table: { head: ['Work', 'Buyer question it targets'], rows: [
          ['Comparison pages', '"[you] vs [competitor]"'],
          ['Alternatives pages', '"[incumbent] alternatives"'],
          ['Use-case and persona pages', '"best [category] for [team or industry]"'],
          ['Integration pages', '"[category] that works with [tool]"'],
          ['Review-site profiles and a review plan', '"is [product] good?"'],
          ['Pitches to cited roundup authors', '"best [category] tools"'],
        ] } }],
      },
      howWeWork,
    ],
    faqs: [
      ['We are pre-revenue. Is this too early?', 'If buyers already ask AI for tools in your category, it is not too early to show up. Start with the free audit to see the gap.'],
      ['Which markets do you work with?', 'Global, English-language SaaS. The audit can be run for any country market.'],
    ],
    related: ['/guides/ai-visibility-for-saas', '/compare/ai-visibility-tools-vs-done-for-you', '/guides/get-listed-in-best-of-articles'],
    published: D,
    updated: D,
  },
  {
    kind: 'segment',
    slug: 'ecommerce-brands',
    title: 'AI Visibility for E-commerce and D2C Brands',
    description: 'Get your products recommended when shoppers ask AI for the best option. Product data, buying guides, reviews and agent-ready product pages.',
    h1: 'AI visibility for e-commerce and D2C brands',
    answer:
      'Shoppers increasingly ask AI assistants "what is the best [product] for [need]". The answers favor brands with complete product data, clear prices and policies, real reviews, and mentions in buying guides and on YouTube and Reddit. BrandPulse shows which product questions you are missing and builds the pages and listings that change the answer.',
    sections: [
      {
        heading: 'What AI checks before recommending a product',
        body: [{ ul: [
          'Price, stock and variants readable in the page HTML',
          'Shipping time and return policy',
          'Ratings and reviews, on site and on marketplaces',
          'Independent buying guides and video reviews that mention the product',
          'Complete product feeds, such as Google Merchant Center',
        ] }],
      },
      {
        heading: 'What we build',
        body: [{ ul: [
          'Need-based collection pages and buying guides ("best [product] for [need]")',
          'Honest comparison pages against the alternatives AI names',
          'Product page fixes so facts are readable by crawlers and agents',
          'A plan for real reviews and outreach to cited guide authors',
        ] }],
      },
      howWeWork,
    ],
    related: ['/guides/assistive-agent-optimization', '/glossary/agentic-commerce', '/services/ai-agent-readiness'],
    published: D,
    updated: D,
  },
  {
    kind: 'segment',
    slug: 'local-businesses',
    title: 'AI Visibility for Local Businesses',
    description: 'Get your clinic, firm or service business recommended when people ask AI for the best option in their city.',
    h1: 'AI visibility for local businesses',
    answer:
      'When someone asks AI for "the best [service] in [city]", the answer leans on Google Business Profiles, review volume, local directories and clear service pages with prices. BrandPulse shows which local questions name your competitors instead of you, then fixes the pages, profiles and listings behind those answers.',
    sections: [
      {
        heading: 'What local AI answers rely on',
        body: [{ ul: [
          'A complete Google Business Profile with the right categories and services',
          'Steady, recent reviews that mention the service',
          'Consistent name, address and phone across directories',
          'A dedicated page for each service with price ranges and process',
          'Local press and community mentions',
        ] }],
      },
      {
        heading: 'What we build',
        body: [{ ul: [
          'Service pages and cost guides for your highest-value services',
          'Profiles completed on the directories AI cites in your category',
          'A review collection process (real reviews only)',
          'Location pages only where you have real local substance',
        ] }],
      },
      howWeWork,
    ],
    related: ['/services/ai-visibility-audit', '/guides/why-ai-recommends-your-competitor'],
    published: D,
    updated: D,
  },
];
