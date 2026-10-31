import type { Doc } from './types';

const D = '2026-10-12';

export const comparisons: Doc[] = [
  {
    kind: 'compare',
    slug: 'aeo-vs-seo',
    title: 'AEO vs SEO: What Is the Difference and Which Do You Need?',
    description: 'Answer engine optimization vs search engine optimization: goals, tactics and metrics compared, and how they work together.',
    h1: 'AEO vs SEO: what is the difference?',
    answer:
      'SEO (search engine optimization) aims to rank pages in search results and earn clicks. AEO (answer engine optimization) aims to have your content extracted as the direct answer in featured snippets, AI Overviews and voice replies. You need both: answer engines pull from search indexes, so SEO makes a page eligible and AEO makes it the answer.',
    takeaways: [
      'SEO competes on pages; AEO competes on passages.',
      'Google says AI Overviews need nothing beyond normal SEO eligibility, so SEO comes first.',
      'AEO adds answer-first writing, question coverage and quotable facts.',
    ],
    sections: [
      {
        heading: 'Side-by-side comparison',
        body: [{ table: { head: ['', 'SEO', 'AEO'], rows: [
          ['Goal', 'Rank and earn the click', 'Be the extracted answer'],
          ['Where it shows', 'Organic results', 'Featured snippets, AI Overviews, voice assistants'],
          ['Unit', 'Page', 'Passage of about 40 to 300 words'],
          ['Key tactics', 'Technical health, relevance, links, user experience', 'Question headings, direct answers, tables, facts, follow-up coverage'],
          ['Metrics', 'Rankings, impressions, clicks', 'Snippet ownership, AI citations, presence in answers'],
          ['Depends on', 'Crawl and index', 'SEO plus content structure'],
        ] } }],
      },
      {
        heading: 'Which should you do first?',
        answer: 'Fix SEO foundations first (crawl, index, speed, core pages), then shape those pages for AEO. Doing AEO on pages that are not indexed has no effect.',
      },
      {
        heading: 'Where does GEO fit?',
        answer: 'GEO targets being named and recommended inside AI-written answers such as ChatGPT and Gemini. It shares AEO\'s writing rules and adds off-site work: mentions, reviews and lists. See [GEO vs SEO](/compare/geo-vs-seo).',
      },
    ],
    related: ['/guides/answer-engine-optimization', '/compare/geo-vs-seo', '/glossary/featured-snippet'],
    published: D,
    updated: D,
  },
  {
    kind: 'compare',
    slug: 'geo-vs-seo',
    title: 'GEO vs SEO: How Generative Engine Optimization Differs',
    description: 'Generative engine optimization vs SEO: how AI assistants choose brands, what changes in strategy, and what stays the same.',
    h1: 'GEO vs SEO: how is generative engine optimization different?',
    answer:
      'SEO earns rankings in search results; GEO earns mentions and recommendations inside AI-written answers from ChatGPT, Gemini, Perplexity and Google AI Mode. GEO builds on SEO, because those engines retrieve from search indexes, but it weighs off-site signals much more: one large study found brand mentions correlated with AI visibility about three times more strongly than backlinks.',
    sections: [
      {
        heading: 'Side-by-side comparison',
        body: [{ table: { head: ['', 'SEO', 'GEO'], rows: [
          ['Goal', 'Rank pages', 'Be named and recommended in AI answers'],
          ['Unit that competes', 'Page', 'Brand (entity) plus passages'],
          ['Strongest off-site signal', 'Links', 'Brand mentions, reviews, lists, community discussion'],
          ['Results vary by', 'Location, device', 'Engine, model version, run, user context'],
          ['Measurement', 'Rank trackers, Search Console', 'Repeated question sets across engines: presence rate, share of voice'],
          ['Speed', 'Weeks to months', 'Weeks for grounded answers; months for model memory'],
        ] } }],
      },
      {
        heading: 'What stays the same?',
        answer: 'Crawlable, fast, server-rendered pages; content that genuinely answers the buyer; and a trustworthy reputation. Engines of both kinds reward the same fundamentals.',
      },
      {
        heading: 'What changes?',
        answer: 'You measure many questions instead of a few keywords, you write each section to be quotable, and you invest more in being discussed on review sites, roundups, Reddit, YouTube and media.',
      },
    ],
    related: ['/guides/generative-engine-optimization', '/compare/aeo-vs-seo', '/glossary/share-of-voice'],
    published: D,
    updated: D,
  },
  {
    kind: 'compare',
    slug: 'ai-visibility-tools-vs-done-for-you',
    title: 'AI Visibility Tools vs a Done-for-You Service: Which to Choose',
    description: 'Self-serve AI visibility monitoring tools compared with a done-for-you service: what each does, who each suits, and the trade-offs.',
    h1: 'AI visibility tools vs a done-for-you service',
    answer:
      'AI visibility tools monitor how often AI answers mention your brand; a done-for-you service measures and then does the fixing: pages, comparisons, listings and re-checks. Tools suit teams with in-house content and SEO capacity that want dashboards. A done-for-you service suits founders and small teams who need the work done, not another report.',
    sections: [
      {
        heading: 'What each option gives you',
        body: [{ table: { head: ['', 'Monitoring tool', 'Done-for-you service'], rows: [
          ['Tracks AI mentions over time', 'Yes, usually across several engines', 'Yes, on a fixed question set re-checked monthly'],
          ['Shows the actual answers', 'Usually', 'Yes, word for word'],
          ['Writes and publishes pages', 'No', 'Yes'],
          ['Gets listings and reviews in place', 'No', 'Yes, with a plan for real reviews'],
          ['Your time needed', 'High: you act on the data', 'Low: kickoff, approvals'],
          ['Best for', 'Marketing teams with writers', 'Founders and lean teams'],
        ] } }],
      },
      {
        heading: 'Who should choose a tool?',
        answer: 'Teams that already have writers and SEO skills, want to track many engines and markets, and mainly need data to prioritize. Well-known monitoring tools in this space include Profound, Peec AI and Otterly.',
      },
      {
        heading: 'Who should choose done for you?',
        answer: 'Founders and small teams who know AI is recommending competitors and need the pages, comparisons and listings actually produced. That is what [BrandPulse\'s done-for-you service](/sprint) does.',
      },
      {
        heading: 'Questions to ask any provider',
        body: [{ ul: [
          'Which AI engines do you actually measure, and how often?',
          'Do you show the full answers, or only a score?',
          'Do you re-check the same questions so results are comparable?',
          'Do you promise rankings? (No one honestly can.)',
          'Who writes the content, and do I approve it?',
        ] }],
      },
    ],
    related: ['/compare/aeo-agency-vs-in-house', '/services/ai-visibility-audit', '/for/saas-startups'],
    published: D,
    updated: D,
  },
  {
    kind: 'compare',
    slug: 'aeo-agency-vs-in-house',
    title: 'AEO Agency vs In-House: Who Should Do Your AI Visibility Work?',
    description: 'Hiring an AEO or GEO agency compared with doing AI visibility in-house: cost drivers, skills needed, speed and control.',
    h1: 'AEO agency vs in-house: who should do the work?',
    answer:
      'Doing AI visibility in-house gives you full control and lower cash cost but needs SEO, writing, outreach and measurement skills plus steady time each week. An agency brings those skills and a process immediately, at a higher monthly cost. Most early-stage companies start with an agency or service and bring the work in-house once the process is proven.',
    sections: [
      {
        heading: 'Comparison',
        body: [{ table: { head: ['', 'In-house', 'Agency or service'], rows: [
          ['Skills needed', 'Technical SEO, writing, outreach, measurement', 'Provided'],
          ['Time from you', 'Several hours per week', 'A few hours per month'],
          ['Speed to start', 'Slower while learning', 'Fast, existing process'],
          ['Control', 'Full', 'Shared; you approve'],
          ['Cost driver', 'Salaries or your time', 'Monthly fee scoped to the work'],
        ] } }],
      },
      {
        heading: 'Warning signs in an agency',
        body: [{ ul: [
          'Guaranteed rankings or guaranteed AI mentions',
          'Fake reviews, fake accounts or mass-produced pages',
          'Selling llms.txt or "AI schema" as the main fix',
          'No before-and-after measurement on the same questions',
        ] }],
      },
    ],
    related: ['/compare/ai-visibility-tools-vs-done-for-you', '/guides/generative-engine-optimization'],
    published: D,
    updated: D,
  },
];
