import type { Doc, DocSection } from './types';

const D = '2026-10-12';

function term(slug: string, name: string, answer: string, sections: DocSection[], related: string[]): Doc {
  return {
    kind: 'glossary',
    slug,
    title: `What is ${name}? Definition and examples`,
    description: answer.length > 155 ? `${answer.slice(0, 152).replace(/\s+\S*$/, '')}...` : answer,
    h1: `What is ${name}?`,
    answer,
    sections,
    related,
    published: D,
    updated: D,
  };
}

export const glossary: Doc[] = [
  term('answer-engine-optimization', 'answer engine optimization (AEO)',
    'Answer engine optimization (AEO) is structuring content so that search and AI systems extract it as the direct answer to a question, in featured snippets, Google AI Overviews or voice replies.',
    [
      { heading: 'How is AEO different from SEO?', answer: 'SEO competes for ranked links and clicks; AEO competes for the extracted answer. AEO depends on SEO because answers are pulled from indexed pages.' },
      { heading: 'What does AEO work involve?', body: [{ ul: ['Question-style headings with direct answers underneath', 'Covering the follow-up questions buyers ask', 'Specific, dated facts and sources', 'Clean technical basics so pages are indexed and snippet-eligible'] }] },
    ],
    ['/guides/answer-engine-optimization', '/compare/aeo-vs-seo', '/glossary/generative-engine-optimization']),

  term('generative-engine-optimization', 'generative engine optimization (GEO)',
    'Generative engine optimization (GEO) is increasing how often AI assistants such as ChatGPT, Gemini, Perplexity and Google AI Mode mention, cite and recommend a brand in the answers they write.',
    [
      { heading: 'Where does the term come from?', answer: 'It was popularized by a 2023 research paper, "GEO: Generative Engine Optimization", presented at KDD 2024, which measured how content changes affect visibility in AI-generated answers.' },
      { heading: 'What drives GEO results?', answer: 'Being retrievable (crawlable, indexable pages), being quotable (specific facts and structure), and being corroborated (mentions, reviews and lists on third-party sites).' },
    ],
    ['/guides/generative-engine-optimization', '/compare/geo-vs-seo', '/glossary/llmo']),

  term('assistive-agent-optimization', 'assistive agent optimization (AAO)',
    'Assistive agent optimization (AAO) is making a business easy for AI agents to verify and act on, so an agent booking, buying or comparing for a user can confirm its offer and complete the task with it.',
    [
      { heading: 'What does an agent need from a business?', body: [{ ul: ['Readable prices or ranges', 'Hours, location and availability', 'Clear shipping, returns and cancellation terms', 'Forms and checkout that work without friction', 'Product or service feeds where supported'] }] },
      { heading: 'Who coined the term?', answer: 'It is usually credited to Jason Barnard of Kalicube in 2025. The term is not yet standardized.' },
    ],
    ['/guides/assistive-agent-optimization', '/glossary/agentic-commerce', '/services/ai-agent-readiness']),

  term('llmo', 'LLMO (large language model optimization)',
    'LLMO, or large language model optimization, is another name for optimizing a brand\'s visibility in answers from large language models. It is used largely interchangeably with generative engine optimization (GEO).',
    [{ heading: 'Is LLMO different from GEO?', answer: 'In practice no. Some use LLMO to emphasize influencing what models learn in training, and GEO for live, search-grounded answers. The work overlaps almost entirely.' }],
    ['/glossary/generative-engine-optimization', '/guides/generative-engine-optimization']),

  term('ai-overviews', 'Google AI Overviews',
    'Google AI Overviews are AI-generated summaries shown at the top of some Google search results, with links to the web pages used as supporting sources.',
    [
      { heading: 'How do pages get cited in AI Overviews?', answer: 'Google says a page must be indexed and eligible to show a snippet; there are no extra technical requirements. Pages that clearly answer a sub-question of the search tend to be the ones cited.' },
      { heading: 'Can you measure AI Overview traffic?', answer: 'Clicks from AI Overviews are included in Search Console\'s Performance report under the Web search type, not shown separately.' },
    ],
    ['/guides/google-ai-overviews', '/glossary/ai-mode', '/glossary/query-fan-out']),

  term('ai-mode', 'Google AI Mode',
    'Google AI Mode is a conversational search experience in Google that answers with a longer AI-written response, links to sources, and supports follow-up questions in the same session.',
    [{ heading: 'How is AI Mode different from AI Overviews?', answer: 'AI Mode writes longer answers, tends to cite more sources per answer, and runs more searches for each follow-up. One Ahrefs study found only about 13.7 percent URL overlap between the two surfaces.' }],
    ['/glossary/ai-overviews', '/guides/google-ai-overviews']),

  term('query-fan-out', 'query fan-out',
    'Query fan-out is when an AI search system splits one question into several related searches across subtopics, then combines what it finds into a single answer. Google says both AI Overviews and AI Mode may use it.',
    [
      { heading: 'Example', answer: '"Best CRM for a small agency" might fan out into searches for agency CRM features, pricing for small teams, comparisons between popular CRMs, and reviews.' },
      { heading: 'Why does it matter for visibility?', answer: 'Each sub-search can surface a different page. A page that answers a follow-up question well can be cited even if it does not rank for the original question, so cover the follow-ups, not just the head term.' },
    ],
    ['/guides/google-ai-overviews', '/guides/answer-engine-optimization']),

  term('grounding', 'grounding (in AI search)',
    'Grounding is when an AI model bases its answer on information retrieved at query time, such as live search results, rather than only on what it learned in training. Grounded answers usually include source links.',
    [{ heading: 'Why does grounding matter for brands?', answer: 'Grounded answers can change as soon as new or updated pages are crawled, so on-site and off-site improvements can show up in weeks rather than waiting for a new model version.' }],
    ['/glossary/ai-citation', '/guides/generative-engine-optimization']),

  term('ai-citation', 'an AI citation',
    'An AI citation is a link to a source shown with an AI-generated answer. A brand mention is when the answer names the brand. The two are different: a page can be cited without its brand being recommended, and a brand can be mentioned without being cited.',
    [{ heading: 'Which matters more?', answer: 'For buyers, being named and recommended matters most. Citations show which sources the engine trusts, which tells you where to earn mentions.' }],
    ['/glossary/citation-gap', '/glossary/share-of-voice', '/glossary/presence-rate']),

  term('citation-gap', 'a citation gap',
    'A citation gap is the set of sources that AI answers cite in your category where your brand is missing or weak, such as review sites, directories and roundup articles. It is a practical target list for off-site work.',
    [{ heading: 'How do you close a citation gap?', body: [{ ol: ['Record which domains AI cites for your buyer questions', 'Check whether you are present on each, and how competitors are described', 'Claim profiles, collect real reviews, and pitch list authors', 'Re-check the same questions after the sources update'] }] }],
    ['/guides/get-listed-in-best-of-articles', '/glossary/ai-citation', '/services/ai-visibility-audit']),

  term('share-of-voice', 'AI share of voice',
    'AI share of voice is the proportion of brand mentions in AI answers that belong to you, compared with your tracked competitors, across a set of buyer questions.',
    [{ heading: 'How is it calculated?', answer: 'Your mentions divided by the sum of your mentions and your tracked competitors\' mentions, across the same questions and engines.' }],
    ['/glossary/presence-rate', '/glossary/ai-citation']),

  term('presence-rate', 'presence rate',
    'Presence rate is the share of buyer questions where an AI answer mentions your brand at all. If you appear in 6 of 40 answers, your presence rate is 15 percent.',
    [{ heading: 'Why measure presence rate?', answer: 'It is simple, honest and comparable over time when the same questions are re-run on the same engines.' }],
    ['/glossary/share-of-voice', '/services/ai-visibility-audit']),

  term('answer-capsule', 'an answer capsule',
    'An answer capsule is a short, self-contained paragraph of about 40 to 90 words placed directly under a page\'s main heading that fully answers the page\'s question, so search and AI systems can quote it on its own.',
    [{ heading: 'What makes a good answer capsule?', body: [{ ul: ['Answers the question in the first sentence', 'Includes a specific fact, number or date', 'Names the subject instead of using pronouns', 'Makes sense with no other context'] }] }],
    ['/guides/how-to-write-content-ai-cites', '/glossary/featured-snippet']),

  term('featured-snippet', 'a featured snippet',
    'A featured snippet is a highlighted excerpt from a web page that Google shows at the top of some results to answer the query directly, with a link to the source page.',
    [{ heading: 'How do you win featured snippets?', answer: 'Answer the query directly under a matching heading in 40 to 60 words, or with a clean list or table, on a page that already ranks on the first page.' }],
    ['/glossary/answer-capsule', '/guides/answer-engine-optimization']),

  term('structured-data', 'structured data (schema markup)',
    'Structured data is code, usually JSON-LD using the Schema.org vocabulary, that describes a page\'s content in a machine-readable way: the organization, products, prices, people, articles and locations it is about.',
    [
      { heading: 'Does structured data help AI visibility?', answer: 'Google says no special schema is required for AI Overviews or AI Mode. Structured data still removes ambiguity about entities, prices and locations for every engine and agent, and powers rich results and merchant listings.' },
      { heading: 'Rule that matters most', answer: 'Structured data must match what is visible on the page. Marking up content that is not shown can lead to a manual action.' },
    ],
    ['/glossary/entity', '/guides/assistive-agent-optimization']),

  term('entity', 'an entity (in search)',
    'An entity is a distinct, identifiable thing such as a business, person, product or place that search engines and AI models recognize and connect facts to, independent of the exact words used to describe it.',
    [{ heading: 'How do you strengthen your brand as an entity?', body: [{ ul: ['Use one consistent name, description and set of facts everywhere', 'Add Organization structured data with sameAs links to official profiles', 'Keep LinkedIn, Crunchbase, directories and Wikidata consistent with your site', 'Earn mentions that pair your brand with your category'] }] }],
    ['/glossary/structured-data', '/glossary/e-e-a-t']),

  term('e-e-a-t', 'E-E-A-T',
    'E-E-A-T stands for experience, expertise, authoritativeness and trustworthiness. It is the framework Google\'s quality raters use to assess content, especially on topics that affect health, money or safety.',
    [{ heading: 'How do you show E-E-A-T?', body: [{ ul: ['Named authors and reviewers with real credentials', 'First-hand experience: original photos, data and cases', 'Sources for claims', 'Clear business information, contact details and policies', 'Reputation on third-party sites'] }] }],
    ['/glossary/entity', '/guides/how-to-write-content-ai-cites']),

  term('oai-searchbot', 'OAI-SearchBot',
    'OAI-SearchBot is OpenAI\'s web crawler for ChatGPT search. OpenAI says it controls whether a site can appear in ChatGPT search results, separately from GPTBot, which collects content for model training.',
    [{ heading: 'Should you allow OAI-SearchBot?', answer: 'Yes, if you want to appear in ChatGPT search. OpenAI notes robots.txt changes can take about 24 hours to apply.' }],
    ['/guides/ai-crawlers-robots-txt', '/guides/how-to-rank-in-chatgpt']),

  term('google-extended', 'Google-Extended',
    'Google-Extended is a robots.txt control token that lets site owners limit use of their content for training Gemini models and for grounding in some Google products outside Search. It does not affect inclusion or ranking in Google Search, including AI Overviews.',
    [{ heading: 'Should you block it?', answer: 'Only if you do not want your content used for Gemini training. Blocking it does not remove you from Google Search or AI Overviews.' }],
    ['/guides/ai-crawlers-robots-txt', '/glossary/oai-searchbot']),

  term('llms-txt', 'llms.txt',
    'llms.txt is a proposed markdown file placed at a site\'s root that summarizes the site and links to its key pages for language models. Google has said it does not use it, and log studies show AI crawlers rarely request it.',
    [{ heading: 'Is it worth adding?', answer: 'It is harmless and quick, but there is no evidence it improves AI visibility. Crawl access and good pages matter far more.' }],
    ['/guides/llms-txt', '/guides/ai-crawlers-robots-txt']),

  term('indexnow', 'IndexNow',
    'IndexNow is an open protocol that lets a website notify participating search engines, including Bing, immediately when a URL is added, updated or deleted, instead of waiting to be recrawled.',
    [{ heading: 'Why does it matter for AI visibility?', answer: 'Microsoft Copilot grounds its answers in the Bing index, so faster Bing indexing can help new and updated pages become available sooner. Google does not use IndexNow.' }],
    ['/guides/ai-crawlers-robots-txt', '/glossary/grounding']),

  term('server-side-rendering', 'server-side rendering (for AI crawlers)',
    'Server-side rendering means a page\'s content is included in the HTML the server sends, rather than being built in the browser by JavaScript. Most AI crawlers do not run JavaScript, so server-rendered content is what they can read.',
    [{ heading: 'How do you check?', answer: 'View the page source (not the inspected page) or fetch it with curl. If the main text, prices and links are missing, crawlers that do not run JavaScript cannot see them.' }],
    ['/guides/ai-crawlers-robots-txt', '/guides/assistive-agent-optimization']),

  term('zero-click-search', 'zero-click search',
    'A zero-click search is a search that ends without the user clicking any result, because the answer is shown directly on the results page, for example in an AI Overview or featured snippet.',
    [{ heading: 'What should businesses do about it?', answer: 'Aim to be the brand named in the answer, not only the link below it. Being recommended builds demand that shows up later as branded searches and direct visits.' }],
    ['/glossary/ai-overviews', '/guides/answer-engine-optimization']),

  term('model-context-protocol', 'the Model Context Protocol (MCP)',
    'The Model Context Protocol (MCP) is an open standard for connecting AI assistants and agents to external tools and data, such as searching a catalog, checking availability or creating a booking. It was donated to the Linux Foundation\'s Agentic AI Foundation in December 2025.',
    [{ heading: 'Does a business need an MCP server?', answer: 'Not yet for most. It is most useful for software products and large merchants that want agents to use their service directly. Clean pages and data come first.' }],
    ['/glossary/webmcp', '/guides/assistive-agent-optimization']),

  term('webmcp', 'WebMCP',
    'WebMCP is a proposed web standard, incubated in a W3C community group, that lets a website declare its forms and functions as tools that AI agents in the browser can discover and call. Chrome ran an origin trial in 2026.',
    [{ heading: 'Should you implement it now?', answer: 'Only for high-value flows and only if your audience uses supporting browsers. Clean, labeled forms already make most actions usable by agents.' }],
    ['/glossary/model-context-protocol', '/guides/assistive-agent-optimization']),

  term('agentic-commerce', 'agentic commerce',
    'Agentic commerce is buying and selling where an AI agent finds, compares and purchases products for a user. It relies on product feeds and protocols such as Google\'s Universal Commerce Protocol (UCP), the Agentic Commerce Protocol (ACP) from OpenAI and Stripe, and the Agent Payments Protocol (AP2).',
    [{ heading: 'What should merchants do first?', body: [{ ul: ['Keep Google Merchant Center data complete and accurate', 'Submit to the OpenAI product feed where eligible', 'Enable the agent and AI channels your commerce platform supports', 'Show prices, stock, shipping and returns in server-rendered HTML'] }] }],
    ['/guides/assistive-agent-optimization', '/glossary/model-context-protocol']),
];
