import type { Doc } from './types';

const D = '2026-10-12';

const S = {
  googleAi: { label: 'Google Search Central: AI features and your website', url: 'https://developers.google.com/search/docs/appearance/ai-features' },
  openaiBots: { label: 'OpenAI: Overview of OpenAI crawlers', url: 'https://developers.openai.com/api/docs/bots' },
  geoPaper: { label: 'Aggarwal et al., GEO: Generative Engine Optimization (KDD 2024)', url: 'https://arxiv.org/abs/2311.09735' },
  spam: { label: 'Google Search Central: spam policies (March 2024 update)', url: 'https://developers.google.com/search/blog/2024/03/core-update-spam-policies' },
  sel: { label: 'Search Engine Land: AI search engines cite Reddit, YouTube and LinkedIn most', url: 'https://searchengineland.com/ai-search-engines-cite-reddit-youtube-and-linkedin-most-study-473138' },
  llms: { label: 'PPC Land: llms.txt adoption rises, but 97% of files get zero AI requests', url: 'https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/' },
  feed: { label: 'OpenAI: Commerce product feed reference', url: 'https://developers.openai.com/commerce/specs/feed' },
};

export const guides: Doc[] = [
  {
    kind: 'guide',
    slug: 'answer-engine-optimization',
    title: 'Answer Engine Optimization (AEO): The Complete Guide',
    description: 'What answer engine optimization is, how answer engines pick the answer they show, and the exact steps to make your pages the answer.',
    h1: 'Answer engine optimization (AEO): the complete guide',
    answer:
      'Answer engine optimization (AEO) is the work of making your content the answer a search or AI system extracts and shows directly, in a featured snippet, a Google AI Overview, or a voice reply. It works by structuring pages so each section opens with a direct, self-contained answer to a real buyer question, on a site the engine can crawl and already trusts.',
    takeaways: [
      'AEO targets the extracted answer, not the ranked link. The competing unit is a passage of roughly 40 to 300 words.',
      'Google says AI Overviews and AI Mode need no special markup: a page must be indexed and eligible for a snippet.',
      'Pages win by answering the question in the first sentence under a question-style heading, then adding proof.',
      'AEO sits on top of SEO. A page that is not crawled and indexed cannot be extracted.',
    ],
    sections: [
      {
        heading: 'What is an answer engine?',
        answer:
          'An answer engine is any system that responds to a question with an answer rather than a list of links. Examples include Google featured snippets, People Also Ask, Google AI Overviews, and voice assistants.',
        body: [
          { p: 'Generative assistants such as ChatGPT and Gemini also answer directly, but they write a new answer from many sources and name brands inside it. Optimizing for that is usually called [generative engine optimization](/guides/generative-engine-optimization). In practice the techniques overlap heavily, and most teams do both together.' },
        ],
      },
      {
        heading: 'How do answer engines choose the answer?',
        answer:
          'They retrieve candidate pages from their search index, split them into passages, and select the passage that answers the question most directly and credibly. The page has to be indexed first; the passage then has to be the clearest match.',
        body: [
          { p: "Google's documentation says that both AI Overviews and AI Mode may use a technique called query fan-out, issuing several related searches across subtopics to build a response. That means the passage that gets cited often answers a sub-question (cost, duration, risks, alternatives), not the headline query. See [query fan-out](/glossary/query-fan-out)." },
          { p: 'Industry studies also show that AI Overviews increasingly cite pages outside the classic top ten results, so a well-structured answer on a smaller site can be selected over a longer page that ranks higher.' },
        ],
      },
      {
        heading: 'AEO vs SEO: what is different?',
        answer:
          'SEO competes for a ranked link and a click. AEO competes for the extracted answer itself. SEO is the entry ticket; AEO is how a page converts that eligibility into being quoted.',
        body: [
          { table: { head: ['', 'SEO', 'AEO'], rows: [
            ['Goal', 'Rank a page and earn the click', 'Be the passage the engine shows or reads out'],
            ['Unit that competes', 'The page', 'The passage'],
            ['Main levers', 'Crawlability, relevance, links, user experience', 'Question headings, answer-first writing, structure, facts'],
            ['Success metric', 'Rankings, clicks', 'Snippet and AI Overview citations, presence in answers'],
          ] } },
          { p: 'A full comparison is in [AEO vs SEO](/compare/aeo-vs-seo).' },
        ],
      },
      {
        heading: 'How do you write content that answer engines extract?',
        answer:
          'Put the question in the heading, answer it completely in the first one to three sentences, then support it with specifics: numbers, a table, steps, and a source.',
        body: [
          { ol: [
            '**Phrase headings as questions** the way buyers ask them ("How long does onboarding take?").',
            '**Answer first.** The first sentence should make sense if it is the only thing quoted.',
            '**Make each section self-contained.** Repeat the subject instead of writing "it" or "as mentioned above".',
            '**Use lists for steps and tables for comparisons.** Engines extract structured content cleanly.',
            '**Add facts.** Prices, durations, counts and dates are quotable; adjectives are not.',
            '**Date your facts** and keep a visible last-updated date.',
          ] },
          { p: 'The research behind this is covered in [how to write content AI will cite](/guides/how-to-write-content-ai-cites).' },
        ],
      },
      {
        heading: 'Which technical basics does AEO depend on?',
        answer:
          'The page must be crawlable, indexable, and have its main text in the server-rendered HTML. Snippet controls such as nosnippet or max-snippet:0 stop the content from being used in answers.',
        body: [
          { ul: [
            'Allow Googlebot and Bingbot in robots.txt and in your CDN or firewall.',
            'Keep key content in text, not images or PDFs.',
            'Do not set nosnippet on pages you want quoted; Google lists it as a control that limits AI features.',
            'Keep structured data consistent with visible text. Google says no special schema is needed for AI features.',
            'Verify the site in Google Search Console and Bing Webmaster Tools.',
          ] },
          { p: 'Our [AI crawler and robots.txt guide](/guides/ai-crawlers-robots-txt) covers the AI-specific crawlers.' },
        ],
      },
      {
        heading: 'How do you measure AEO?',
        answer:
          'Track the specific questions you want to own and check, on a schedule, whether your page is the one extracted or cited. Search Console includes AI Overview and AI Mode clicks inside its normal Web totals.',
        body: [
          { p: 'Because AI answers vary between runs, measure a fixed set of questions repeatedly rather than a single check. That is how the [BrandPulse audit](/#audit) works: the same buyer questions, re-run monthly, with every answer recorded.' },
        ],
      },
    ],
    faqs: [
      ['Is AEO replacing SEO?', 'No. Answer engines retrieve from search indexes, so SEO remains the prerequisite. AEO adds a layer focused on being the extracted answer.'],
      ['Do I need FAQ schema for AEO?', 'Not for Google: it retired FAQ rich results in May 2026 and says no special markup is needed for AI features. Visible question-and-answer content still helps extraction; the markup is optional.'],
      ['How long does AEO take to work?', 'Changes to an indexed page can show within days to weeks of recrawling. New pages and authority building take longer, typically three to six months to compound.'],
    ],
    related: ['/guides/generative-engine-optimization', '/compare/aeo-vs-seo', '/guides/google-ai-overviews', '/glossary/featured-snippet'],
    sources: [S.googleAi, S.geoPaper],
    published: D,
    updated: D,
  },

  {
    kind: 'guide',
    slug: 'generative-engine-optimization',
    title: 'Generative Engine Optimization (GEO): How to Get Recommended by AI',
    description: 'How ChatGPT, Gemini, Perplexity and Google AI Mode build answers, what correlates with being recommended, and a practical GEO plan.',
    h1: 'Generative engine optimization (GEO): how to get recommended by AI',
    answer:
      'Generative engine optimization (GEO) is the practice of increasing how often AI assistants like ChatGPT, Gemini, Perplexity and Google AI Mode mention, cite and recommend your brand in the answers they write. It combines retrievable, citable pages on your own site with being discussed positively on the third-party sites these engines trust.',
    takeaways: [
      'Generative engines retrieve sources first, then write. If you are not retrievable you cannot be cited.',
      'In one large Ahrefs study, branded web mentions correlated with AI Overview visibility far more than backlinks (0.664 vs 0.218).',
      'A 2024 research paper found adding statistics, quotations and sources raised visibility in generated answers by roughly 30 to 40 percent; keyword stuffing made it worse.',
      'Engines differ. One analysis found only about 11 percent of domains are cited by both ChatGPT and Perplexity, so measure per engine.',
    ],
    sections: [
      {
        heading: 'How does a generative engine build an answer?',
        answer:
          'It rewrites the question, runs several searches (query fan-out), retrieves candidate pages, picks the passages that answer each sub-question, and writes an answer that blends those passages with what the model already learned in training.',
        body: [
          { ol: [
            '**Understand** the prompt, often adding location or context.',
            '**Fan out** into related searches: cost, comparisons, reviews, how to choose.',
            '**Retrieve** from a search index (Google, Bing, or the engine\'s own crawler) plus structured sources such as business profiles and product feeds.',
            '**Select passages** that answer each sub-question.',
            '**Synthesize** an answer, naming brands and sometimes linking sources.',
          ] },
          { p: 'Being cited and being recommended are different. A page can be used as a source while the brand on it is not the one recommended. See [citation vs mention](/glossary/ai-citation).' },
        ],
      },
      {
        heading: 'What makes AI recommend one brand over another?',
        answer:
          'The strongest public evidence points to how widely and consistently the brand is discussed across the web, followed by brand search demand, review platform presence, and having clear, citable pages for the questions buyers ask.',
        body: [
          { table: { head: ['Signal', 'What the evidence says'], rows: [
            ['Branded web mentions', 'Ahrefs, 75,000 brands: correlation of 0.664 with AI Overview visibility, versus 0.218 for backlinks.'],
            ['Brand search demand', 'Reported by Kevin Indig (Growth Memo) as one of the strongest predictors of ChatGPT visibility.'],
            ['Review platforms', 'SE Ranking reported domains with active G2, Capterra or Trustpilot profiles were about three times more likely to be cited by ChatGPT.'],
            ['High-citation domains', 'Reddit, YouTube, Wikipedia and LinkedIn are among the most cited domains across major engines (Peec AI, 30 million sources).'],
            ['Citable content', 'Statistics, expert quotations and named sources raised visibility in the GEO paper\'s test setup.'],
            ['Freshness', 'Ahrefs found AI-cited content is on average about 25.7 percent fresher than organic results.'],
          ] } },
          { note: 'These are correlational, vendor-run studies. Treat the numbers as direction, not law.' },
        ],
      },
      {
        heading: 'Why do different AI engines give different answers?',
        answer:
          'They use different indexes, different retrieval systems and different models. Google AI Overviews and AI Mode, ChatGPT search, Perplexity and Copilot each favor different sources, so a brand can be visible in one and absent in another.',
        body: [
          { ul: [
            '**Google AI Overviews and AI Mode** retrieve from Google\'s index with heavy fan-out. Ahrefs found only 13.7 percent URL overlap between the two surfaces.',
            '**ChatGPT search** uses OpenAI\'s OAI-SearchBot index, search partners and merchant product feeds; Wikipedia and Reddit are its most cited domains in Similarweb data.',
            '**Perplexity** runs its own crawler and leans heavily on YouTube and review sources.',
            '**Copilot** grounds in the Bing index. Bing Webmaster Tools now has an AI Performance report showing Copilot citations.',
          ] },
        ],
      },
      {
        heading: 'What is the GEO playbook, step by step?',
        answer:
          'Fix crawl and rendering, build a page for every high-value buyer question, write those pages to be quotable, then earn mentions on the third-party sources AI already cites in your category. Re-measure monthly.',
        body: [
          { ol: [
            '**Measure first.** Run your buyer questions through the engines and record who gets named and which sources are cited. That is the [AI visibility audit](/services/ai-visibility-audit).',
            '**Make the site retrievable.** Allow search and AI crawlers, server-render content, fix indexing. See [AI crawlers and robots.txt](/guides/ai-crawlers-robots-txt).',
            '**Build the missing pages.** Service and product pages, pricing, comparisons, alternatives, cost guides, and answers to the follow-up questions.',
            '**Write for extraction.** Answer first, facts, tables, sources. See [how to write content AI will cite](/guides/how-to-write-content-ai-cites).',
            '**Win off-site.** Review platforms, the "best X" articles AI cites, Reddit and YouTube presence, and press. See [how to get into best-of lists](/guides/get-listed-in-best-of-articles).',
            '**Make the brand unambiguous.** One consistent description, name and facts everywhere, connected with Organization schema and sameAs links.',
            '**Re-check the same questions monthly** and adjust.',
          ] },
        ],
      },
      {
        heading: 'What should you avoid?',
        answer:
          'Mass-produced pages, fake reviews, hidden text, keyword stuffing and self-serving rankings. Google treats scaled low-value content as spam however it is produced, and the GEO paper found keyword stuffing reduced visibility.',
        body: [
          { p: 'Also be skeptical of shortcuts sold as GEO: an llms.txt file alone does not make AI recommend you. See [does llms.txt work?](/guides/llms-txt).' },
        ],
      },
    ],
    faqs: [
      ['Is GEO the same as AEO?', 'They overlap. AEO focuses on being the extracted answer; GEO focuses on being mentioned and recommended inside AI-written answers. Most of the work is shared.'],
      ['Can anyone guarantee that ChatGPT will recommend my brand?', 'No. AI answers vary by run, user, location and model version. Honest GEO raises the probability and measures it across many questions over time.'],
      ['Do backlinks still matter for GEO?', 'Yes for SEO and discovery, but studies show brand mentions correlate more strongly with AI visibility than raw link counts.'],
    ],
    related: ['/guides/how-to-rank-in-chatgpt', '/guides/why-ai-recommends-your-competitor', '/compare/geo-vs-seo', '/glossary/share-of-voice'],
    sources: [S.geoPaper, S.googleAi, S.sel],
    published: D,
    updated: D,
  },

  {
    kind: 'guide',
    slug: 'assistive-agent-optimization',
    title: 'Assistive Agent Optimization (AAO): Getting Chosen by AI Agents',
    description: 'What assistive agent optimization means, how AI agents decide which business to book or buy from, and the readiness checklist.',
    h1: 'Assistive agent optimization (AAO): getting chosen by AI agents',
    answer:
      'Assistive agent optimization (AAO) is making your business easy for AI agents to verify and act on, so that when an agent books, buys or compares on someone\'s behalf, it can confirm your price, availability and policies and complete the task with you. It builds on SEO and GEO and adds machine-readable offers, clean forms and commerce feeds.',
    takeaways: [
      'Agents drop businesses they cannot verify: hidden prices, missing policies and image-only menus are common failures.',
      'Most AI crawlers and many agents do not run JavaScript, so key facts must be in the server HTML.',
      'For shops, complete product feeds (Google Merchant Center, the OpenAI product feed) are the main lever today.',
      'Protocols such as MCP, WebMCP, UCP and ACP are emerging; use them through your platform before building custom.',
    ],
    sections: [
      {
        heading: 'What do AI agents actually do?',
        answer:
          'They complete tasks: shortlist options, check constraints such as price, location, availability and ratings, then fill a form, book a slot or check out. Examples include agentic browsing in Chrome with Gemini, ChatGPT\'s agent, and shopping agents inside AI search.',
      },
      {
        heading: 'How does an agent choose a business?',
        answer:
          'It shortlists using search-style retrieval, then verifies each option against the user\'s constraints, then tries to act. A business fails at verification if its facts are unreadable and at action if its forms or checkout break for automation.',
        body: [
          { table: { head: ['Level', 'The agent can', 'What it takes'], rows: [
            ['0. Invisible', 'Not read the site', 'Crawl blocks or JavaScript-only content'],
            ['1. Readable', 'Understand what you offer', 'Server-rendered pages with clear text'],
            ['2. Verifiable', 'Check price, hours, location, policies, ratings', 'Prices and terms in HTML and structured data; policy pages; reviews'],
            ['3. Actionable', 'Complete a booking or form', 'Labeled form fields, booking without forced login, deep links'],
            ['4. Transactable', 'Buy or book via feeds and protocols', 'Merchant Center, OpenAI product feed, platform agent checkout'],
            ['5. Callable', 'Use your business as a tool', 'An MCP server or WebMCP tools'],
          ] } },
        ],
      },
      {
        heading: 'What is the AAO checklist?',
        answer:
          'Publish prices or ranges, hours, location, shipping, returns and cancellation terms in plain HTML and structured data; keep forms simple and labeled; and keep product or service feeds complete and consistent with the site.',
        body: [
          { ul: [
            'Prices or ranges for every offer, not "call for price" alone.',
            'Hours, address and service area matching your Google Business Profile.',
            'Shipping, returns and cancellation policies on their own pages and summarized on product pages.',
            'Every form field with a visible label and the right input type; no hard CAPTCHA on the first step if you can avoid it.',
            'Booking or signup that works without creating an account first.',
            'AI user agents (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-User) not blocked by your firewall on product, pricing and booking pages.',
          ] },
        ],
      },
      {
        heading: 'Which agent protocols matter in 2026?',
        answer:
          'MCP for agents calling tools, WebMCP for websites declaring actions to in-browser agents, NLWeb for natural-language access to site content, and the commerce protocols UCP (Google with Shopify), ACP (OpenAI with Stripe) and AP2 for payment authorization.',
        body: [
          { p: 'Most of these are still maturing, and reports conflict on some details, such as the status of in-chat checkout in ChatGPT. For most businesses the practical move is to enable the agent and AI channels your commerce or booking platform already supports, and keep your [structured data](/glossary/structured-data) clean so adopting new standards later is easy.' },
        ],
      },
    ],
    faqs: [
      ['Where does the term AAO come from?', 'It is commonly credited to Jason Barnard of Kalicube in 2025. The term is not standardized; some say AI assistive agent optimization.'],
      ['Is AAO only for e-commerce?', 'No. Any business that can be booked, hired or bought from benefits: clinics, agencies, SaaS trials, restaurants and travel.'],
    ],
    related: ['/services/ai-agent-readiness', '/guides/generative-engine-optimization', '/glossary/model-context-protocol', '/glossary/agentic-commerce'],
    sources: [S.feed, S.openaiBots],
    published: D,
    updated: D,
  },

  {
    kind: 'guide',
    slug: 'how-to-rank-in-chatgpt',
    title: 'How to Get Your Brand Recommended in ChatGPT',
    description: 'How ChatGPT search finds and chooses sources, what correlates with being recommended, and the steps to raise your visibility.',
    h1: 'How to get your brand recommended in ChatGPT',
    answer:
      'To get recommended in ChatGPT, make sure OpenAI\'s search crawler (OAI-SearchBot) can read your server-rendered pages, publish clear pages for the exact questions buyers ask, and build the off-site signals ChatGPT leans on: brand mentions, review platform profiles, Reddit and Wikipedia-level sources, and inclusion in the "best X" articles it cites.',
    takeaways: [
      'OAI-SearchBot governs inclusion in ChatGPT search; GPTBot is for training and blocking it does not remove you from search.',
      'Wikipedia and Reddit are the most cited domains in ChatGPT answers in Similarweb data.',
      'Product and transactional pages are the most cited page type for commercial ChatGPT answers in 2026 studies.',
      'Self-promotional "best X" lists ranking yourself first have been losing citation share.',
    ],
    sections: [
      {
        heading: 'How does ChatGPT decide which sources to use?',
        answer:
          'When ChatGPT searches, it retrieves pages from OpenAI\'s search index and partners, reads the most relevant passages, and writes an answer. For questions it answers without searching, it relies on what the model learned in training, which reflects how widely your brand was discussed.',
      },
      {
        heading: 'Which OpenAI crawlers should you allow?',
        answer:
          'Allow OAI-SearchBot (search inclusion) and ChatGPT-User (pages fetched when a user asks). GPTBot is the training crawler; allowing it is a licensing choice that helps future models know your brand.',
        body: [
          { table: { head: ['User agent', 'Purpose', 'Recommendation'], rows: [
            ['OAI-SearchBot', 'ChatGPT search index', 'Allow, or you will not appear in ChatGPT search results'],
            ['ChatGPT-User', 'User-initiated fetches; OpenAI says robots.txt may not apply', 'Allow'],
            ['GPTBot', 'Model training', 'Your choice'],
          ] } },
          { p: 'OpenAI notes robots.txt changes can take about 24 hours to take effect. Check that your CDN or firewall is not blocking these agents before robots.txt is even read. More in [AI crawlers and robots.txt](/guides/ai-crawlers-robots-txt).' },
        ],
      },
      {
        heading: 'What content does ChatGPT cite most?',
        answer:
          'For commercial questions, 2026 studies found product and transactional pages are cited most, followed by comparison content and lists. For informational questions, encyclopedic and community sources such as Wikipedia and Reddit dominate.',
        body: [
          { p: 'So the pages to build are your [service or product pages](/services/answer-engine-optimization) with clear facts and prices, honest comparison pages, cost guides, and answers to the follow-up questions buyers ask.' },
        ],
      },
      {
        heading: 'What off-site work moves ChatGPT visibility?',
        answer:
          'Getting discussed on the sites ChatGPT already cites for your category: review platforms, the top "best X" articles, Reddit threads, YouTube, industry media and, where you are genuinely notable, Wikipedia.',
        body: [
          { ol: [
            'Find the domains ChatGPT cites for your buyer questions (an audit shows this as the citation gap).',
            'Claim and complete profiles on the review platforms among them, then collect real reviews steadily.',
            'Contact the authors of cited "best X" articles with verifiable facts. See [how to get into best-of lists](/guides/get-listed-in-best-of-articles).',
            'Participate openly in relevant communities under your real name, disclosing your affiliation.',
            'Publish something worth citing: original data, a benchmark, a price index.',
          ] },
        ],
      },
      {
        heading: 'How do you track ChatGPT visibility?',
        answer:
          'Ask a fixed set of buyer questions on a schedule and record whether you are mentioned, recommended or cited, and who is named instead. Also segment chatgpt.com referral traffic in your analytics.',
      },
    ],
    faqs: [
      ['Does ChatGPT use Bing?', 'ChatGPT search has used search partners including Bing alongside OpenAI\'s own index; studies disagree on how much its citations overlap with Bing results. Being indexed well by Bing is a sensible baseline.'],
      ['Will adding llms.txt get me into ChatGPT?', 'There is no official confirmation that OpenAI uses llms.txt, and log studies show most llms.txt files are rarely requested. See [does llms.txt work?](/guides/llms-txt).'],
      ['How fast can ChatGPT answers change?', 'Search-based answers can change within weeks of new pages being crawled. What the model knows from training changes only with new model versions.'],
    ],
    related: ['/guides/generative-engine-optimization', '/services/chatgpt-visibility', '/glossary/oai-searchbot', '/guides/why-ai-recommends-your-competitor'],
    sources: [S.openaiBots, S.sel],
    published: D,
    updated: D,
  },

  {
    kind: 'guide',
    slug: 'google-ai-overviews',
    title: 'How to Get Cited in Google AI Overviews and AI Mode',
    description: 'What Google officially says about AI Overviews and AI Mode, how query fan-out picks sources, and what to change on your pages.',
    h1: 'How to get cited in Google AI Overviews and AI Mode',
    answer:
      'Google says there are no extra requirements to appear in AI Overviews or AI Mode: a page must be indexed and eligible to show a snippet, and standard SEO best practices apply. In practice, pages get cited when a clearly headed passage answers one of the sub-questions Google\'s query fan-out searches for, on a site Google trusts.',
    takeaways: [
      'Eligibility: indexed and snippet-eligible. No special schema or AI text files required (Google, December 2025).',
      'Both surfaces may use query fan-out, so answering follow-up questions earns citations.',
      'AI Overviews and AI Mode cite different URLs: about 13.7 percent overlap in one Ahrefs study.',
      'AI Overview and AI Mode clicks are counted in Search Console under the Web search type.',
    ],
    sections: [
      {
        heading: 'What does Google officially say?',
        answer:
          'Google\'s AI features documentation says to follow normal SEO fundamentals: allow crawling, use internal links, keep important content in text, provide a good page experience, keep structured data matching visible text, and keep Merchant Center and Business Profile data current.',
        body: [
          { p: 'It also says you do not need new machine-readable files, AI text files, or special schema. Controls such as nosnippet, data-nosnippet, max-snippet and noindex limit how your content appears. Google-Extended affects Gemini training and grounding in some other products, not Search.' },
        ],
      },
      {
        heading: 'How does query fan-out affect which pages get cited?',
        answer:
          'Google may run several related searches for one question. Each sub-search can surface a different page, so a page that clearly answers a sub-question (cost, how long, risks, alternatives) can be cited even if it does not rank for the main query.',
        body: [
          { p: 'Build pages and sections for the follow-up questions, not only the head term. See [query fan-out](/glossary/query-fan-out).' },
        ],
      },
      {
        heading: 'How are AI Overviews and AI Mode different?',
        answer:
          'AI Overviews are short summaries on the results page and lean on specific passages. AI Mode is a conversational search experience that writes longer answers, cites more sources per answer, and fans out again on each follow-up.',
      },
      {
        heading: 'What should you change on your pages?',
        answer:
          'Add question-style headings with direct answers, cover the follow-up questions, include specific facts with dates and sources, and make sure local and product data in Business Profile and Merchant Center is complete.',
        body: [
          { ul: [
            'Answer capsule of 40 to 80 words under the H1.',
            'One H2 per buyer sub-question, each opening with the answer.',
            'Tables for comparisons and prices.',
            'Visible author and last-updated date on advisory content.',
            'Remove nosnippet from pages you want quoted.',
          ] },
        ],
      },
    ],
    faqs: [
      ['Can I opt out of AI Overviews but stay in Search?', 'Google offers snippet controls (nosnippet, max-snippet, data-nosnippet). These limit how your content is shown, including in AI features, and can reduce snippets in classic results too.'],
      ['Does structured data help AI Overviews?', 'Google says no special schema is required. Structured data still helps engines understand entities and is required for some rich results and merchant listings.'],
    ],
    related: ['/services/google-ai-overviews-optimization', '/guides/answer-engine-optimization', '/glossary/ai-overviews', '/glossary/query-fan-out'],
    sources: [S.googleAi],
    published: D,
    updated: D,
  },

  {
    kind: 'guide',
    slug: 'ai-crawlers-robots-txt',
    title: 'AI Crawlers and robots.txt: Which Bots to Allow in 2026',
    description: 'The user agents behind ChatGPT, Google AI, Perplexity, Claude and Copilot, what each does, and a robots.txt template for AI visibility.',
    h1: 'AI crawlers and robots.txt: which bots to allow',
    answer:
      'If you want to appear in AI answers, allow the search crawlers behind them: Googlebot (Google AI Overviews and AI Mode), Bingbot (Copilot), OAI-SearchBot (ChatGPT search), PerplexityBot and Claude-SearchBot, plus their user-triggered fetchers. Training crawlers such as GPTBot, ClaudeBot and Google-Extended are a separate licensing choice that does not affect search inclusion.',
    takeaways: [
      'Search crawlers and training crawlers are controlled separately.',
      'Blocking Googlebot removes you from Google AI features; Google-Extended does not affect Search.',
      'Firewalls and bot protection often block AI crawlers before robots.txt is read. Check both.',
      'Most AI crawlers do not run JavaScript; server-render your content.',
    ],
    sections: [
      {
        heading: 'Which AI crawlers exist and what do they do?',
        answer: 'Each major AI company runs separate agents for search indexing, user-triggered fetching, and model training.',
        body: [
          { table: { head: ['User agent', 'Company', 'Purpose', 'For AI visibility'], rows: [
            ['Googlebot', 'Google', 'Search, AI Overviews, AI Mode', 'Allow'],
            ['Google-Extended', 'Google', 'Control token for Gemini training and grounding in some non-Search products', 'Your choice'],
            ['Bingbot', 'Microsoft', 'Bing and Copilot grounding', 'Allow'],
            ['OAI-SearchBot', 'OpenAI', 'ChatGPT search index', 'Allow'],
            ['ChatGPT-User', 'OpenAI', 'Fetches when a user asks', 'Allow'],
            ['GPTBot', 'OpenAI', 'Training', 'Your choice'],
            ['PerplexityBot', 'Perplexity', 'Perplexity index', 'Allow'],
            ['Perplexity-User', 'Perplexity', 'User-triggered fetches', 'Allow'],
            ['Claude-SearchBot', 'Anthropic', 'Claude search index', 'Allow'],
            ['Claude-User', 'Anthropic', 'User-triggered fetches', 'Allow'],
            ['ClaudeBot', 'Anthropic', 'Training', 'Your choice'],
            ['Applebot / Applebot-Extended', 'Apple', 'Siri and Spotlight / training control', 'Allow / your choice'],
            ['CCBot', 'Common Crawl', 'Open dataset used by many model builders', 'Your choice'],
          ] } },
          { note: 'User-agent names change. Check each vendor\'s documentation before shipping a robots.txt.' },
        ],
      },
      {
        heading: 'What robots.txt should a business use?',
        answer:
          'For most businesses that want to be recommended, allow all reputable search and AI crawlers and disallow only private areas such as carts, accounts and APIs.',
        body: [
          { p: 'A minimal version:' },
          { code: ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /account', '', 'Sitemap: https://example.com/sitemap.xml'].join('\n') },
          { p: 'Publishers that license content may block training crawlers while allowing search crawlers. For a business that wants customers, blocking training reduces how well future models know the brand.' },
        ],
      },
      {
        heading: 'Why can AI crawlers still not see my site?',
        answer:
          'The usual causes are a CDN or firewall blocking bots, content that only appears after JavaScript runs, pages behind login or cookie walls, and noindex or nosnippet tags.',
        body: [
          { ol: [
            'Fetch a page with an AI user agent (for example with curl) and confirm you get a 200 and the full text.',
            'View the page source, not the rendered page, and check the main content is there.',
            'Check bot management settings in your CDN for AI crawler rules.',
            'Check server logs for 403 or 429 responses to these agents.',
          ] },
        ],
      },
    ],
    faqs: [
      ['Does blocking GPTBot remove me from ChatGPT?', 'No. OpenAI says OAI-SearchBot governs ChatGPT search; GPTBot is for training.'],
      ['Does Google-Extended affect my Google rankings?', 'No. Google says it does not affect inclusion in Search and is not a ranking signal.'],
    ],
    related: ['/guides/llms-txt', '/glossary/oai-searchbot', '/glossary/server-side-rendering', '/guides/how-to-rank-in-chatgpt'],
    sources: [S.openaiBots, S.googleAi],
    published: D,
    updated: D,
  },

  {
    kind: 'guide',
    slug: 'llms-txt',
    title: 'Does llms.txt Work? What the Evidence Shows in 2026',
    description: 'What llms.txt is, whether Google, OpenAI and other AI systems read it, and whether it is worth adding to your site.',
    h1: 'Does llms.txt work?',
    answer:
      'llms.txt is a proposed markdown file that lists a site\'s key pages for language models. As of 2026 there is little evidence it improves AI visibility: Google has said it does not use it, and an Ahrefs log study found 97 percent of llms.txt files received zero requests in May 2026. It is cheap and harmless to add, but it is not a ranking lever.',
    takeaways: [
      'Google does not support llms.txt and has no plans to, per its Search team in 2025.',
      'No official OpenAI confirmation that its crawlers read it.',
      'Adoption grew about 8.8 times in a year, but usage by crawlers stayed very low.',
      'Crawlability, server-rendered content and off-site mentions matter far more.',
    ],
    sections: [
      {
        heading: 'What is llms.txt?',
        answer:
          'A plain markdown file at /llms.txt with a short description of the site and links to its most important pages, proposed in 2024 as a way to help language models find clean content.',
      },
      {
        heading: 'Do AI systems actually read it?',
        answer:
          'Rarely, according to the available data. Ahrefs analyzed server logs across about 137,000 domains and found most llms.txt files were never requested; among the requests that did happen, GPTBot accounted for a small share.',
        body: [
          { p: 'Google\'s Gary Illyes said in 2025 that Google does not support it, and John Mueller compared it to the old keywords meta tag. We found no official OpenAI statement committing to use it.' },
        ],
      },
      {
        heading: 'Should you add one anyway?',
        answer:
          'Add one only if it takes minutes and you keep it accurate. Spend real effort on what engines demonstrably use: crawl access, indexable server-rendered pages, structured data, and third-party mentions.',
        body: [
          { p: 'BrandPulse\'s own [llms.txt](/llms.txt) exists for completeness. We do not sell it as a visibility fix. See [AI crawlers and robots.txt](/guides/ai-crawlers-robots-txt) for the controls that do matter.' },
        ],
      },
    ],
    related: ['/guides/ai-crawlers-robots-txt', '/glossary/llms-txt', '/guides/generative-engine-optimization'],
    sources: [S.llms, S.googleAi],
    published: D,
    updated: D,
  },

  {
    kind: 'guide',
    slug: 'why-ai-recommends-your-competitor',
    title: 'Why AI Recommends Your Competitor Instead of You',
    description: 'The six most common reasons AI assistants name a competitor and not you, how to diagnose each, and what to fix first.',
    h1: 'Why AI recommends your competitor instead of you',
    answer:
      'AI assistants usually recommend a competitor because the competitor is easier to retrieve and more widely corroborated: it has pages that directly answer the buyer\'s question, more reviews and mentions on the sites AI trusts, and a clearer, more consistent description of what it does. You can diagnose which of these applies by looking at the actual answers and the sources they cite.',
    takeaways: [
      'Look at the evidence: which sources the AI cited when it named the competitor.',
      'The fix is often off-site: reviews, listings and third-party articles, not only your own pages.',
      'Missing pages for cost, comparison and alternatives questions are the most common on-site gap.',
    ],
    sections: [
      {
        heading: 'Reason 1: your site cannot be read',
        answer: 'If crawlers are blocked or your content loads only with JavaScript, AI systems cannot retrieve your pages at all.',
        body: [{ p: 'Check with the steps in [AI crawlers and robots.txt](/guides/ai-crawlers-robots-txt).' }],
      },
      {
        heading: 'Reason 2: you have no page for the question',
        answer: 'If the buyer asks about cost, a comparison or a specific use case and only your competitor has a page that answers it, the competitor\'s page gets retrieved.',
        body: [{ p: 'Build the page for each missed question: pricing, cost guides, comparisons, alternatives, use cases.' }],
      },
      {
        heading: 'Reason 3: the web talks about them, not you',
        answer: 'Brand mentions on other sites correlate strongly with AI visibility. If review platforms, articles and forums discuss your competitor and not you, AI follows that consensus.',
      },
      {
        heading: 'Reason 4: they are on the lists AI reads',
        answer: 'For "best X" questions, AI often draws on a handful of third-party roundup articles. If your competitor is on them and you are not, you are invisible for that question.',
        body: [{ p: 'See [how to get into best-of lists](/guides/get-listed-in-best-of-articles).' }],
      },
      {
        heading: 'Reason 5: your pages say less',
        answer: 'Vague copy ("world-class solutions") gives the model nothing to quote. Specific facts, prices, numbers and named proof do.',
        body: [{ p: 'See [how to write content AI will cite](/guides/how-to-write-content-ai-cites).' }],
      },
      {
        heading: 'Reason 6: your brand is ambiguous',
        answer: 'If your name, description, location or category differ across your site and profiles, models are less confident about who you are and what you do.',
      },
      {
        heading: 'How do you find out which reason applies?',
        answer: 'Run the buyer questions, read the answers that named the competitor, and list the sources they cited. Those sources tell you what to fix.',
        body: [{ p: 'That is exactly what the [free BrandPulse audit](/#audit) records: every answer word for word and the domains cited.' }],
      },
    ],
    related: ['/services/ai-visibility-audit', '/guides/generative-engine-optimization', '/guides/get-listed-in-best-of-articles'],
    published: D,
    updated: D,
  },

  {
    kind: 'guide',
    slug: 'how-to-write-content-ai-cites',
    title: 'How to Write Content That AI Will Cite',
    description: 'Passage-level writing rules for AI search: answer-first structure, facts, quotations and sources, with the research behind each rule.',
    h1: 'How to write content that AI will cite',
    answer:
      'Write every section so it can be quoted on its own: a question as the heading, a direct answer in the first sentence, then specific facts, a table or steps, and a named source. Research on generative engines found that adding statistics, quotations and citations raised visibility by roughly 30 to 40 percent in a test setting, while keyword stuffing lowered it.',
    takeaways: [
      'AI engines retrieve passages, not pages. Each section must stand alone.',
      'Numbers, dates, prices and named sources make sentences quotable.',
      'Honest limitations and "who it is not for" get cited for pros-and-cons questions.',
      'Update substance, not just the date. Date-only edits show no measured lift.',
    ],
    sections: [
      {
        heading: 'Why does passage structure matter?',
        answer:
          'Generative engines split pages into chunks and pick the chunk that best answers each sub-question. A section that depends on earlier context ("as mentioned above") is a weaker chunk than one that restates its subject.',
      },
      {
        heading: 'What are the core writing rules?',
        answer: 'Question headings, answer first, self-contained sections, specific facts, tables for comparisons, sources and dates.',
        body: [
          { ol: [
            'Phrase each heading as the question a buyer asks.',
            'Answer it fully in one to three sentences.',
            'Repeat the subject by name instead of using pronouns.',
            'Add numbers, prices, durations and dates.',
            'Use a table when comparing options.',
            'Quote a named expert with their credential.',
            'Link the primary source.',
            'State who it is for and who it is not for.',
            'Show a visible last-updated date and keep facts current.',
          ] },
        ],
      },
      {
        heading: 'What did the GEO research actually find?',
        answer:
          'The 2024 paper by Aggarwal and colleagues tested nine methods on a benchmark of about 10,000 queries using a simulated generative engine. Adding statistics, quotations and citations performed best; keyword stuffing performed worse than doing nothing.',
        body: [
          { note: 'The experiments used a simulated engine, not live ChatGPT or Google. The direction is useful; the exact percentages will not transfer one to one.' },
        ],
      },
      {
        heading: 'Example: before and after',
        answer: 'Specific beats generic. The second version below answers what, who, where, how much and how good in one paragraph.',
        body: [
          { p: '**Before:** "We are passionate about delivering world-class growth solutions with cutting-edge technology."' },
          { p: '**After:** "Acme is a bookkeeping service for US e-commerce brands with under $5M in revenue. Monthly plans start at $400, books close within 10 business days, and the team holds a 4.8 rating from 120 reviews on G2." (Illustrative example.)' },
        ],
      },
    ],
    related: ['/guides/answer-engine-optimization', '/guides/generative-engine-optimization', '/glossary/answer-capsule'],
    sources: [S.geoPaper],
    published: D,
    updated: D,
  },

  {
    kind: 'guide',
    slug: 'get-listed-in-best-of-articles',
    title: 'How to Get Your Business Into the "Best X" Articles AI Cites',
    description: 'How AI answers to "best X" questions draw on roundup articles, how to find the ones that matter, and how to pitch the authors honestly.',
    h1: 'How to get into the "best X" articles AI cites',
    answer:
      'AI answers to "best X" questions often lean on a small number of third-party roundup articles. Find the ones the engines actually cite for your buyer questions, then give their authors a short, verifiable reason to include you: clear facts, real reviews, pricing, and an offer to try the product or service.',
    takeaways: [
      'Third-party lists carry more weight than your own self-ranking list.',
      'Prioritize lists that are cited by more than one AI engine and rank on page one.',
      'Pitch with verifiable facts, not adjectives, and accept that authors decide.',
    ],
    sections: [
      {
        heading: 'Why do roundup articles matter so much?',
        answer:
          'For "best" and "top" questions, engines retrieve pages that already compare options. A few roundups therefore shape many answers. One 2026 study of B2B queries found that when a brand\'s own listicle was cited, AI Overviews still left that brand out of the recommendation 69 percent of the time, so third-party lists matter more than your own.',
      },
      {
        heading: 'How do you find the lists that matter?',
        answer: 'Run your buyer questions through the AI engines and record the cited domains, then search the same questions and note the roundups on page one.',
        body: [
          { ol: [
            'List your top 20 "best X" and "top X for Y" questions.',
            'Record the sources each AI answer cites (an audit does this automatically).',
            'Rank the lists by how many engines cite them and how high they rank.',
            'Check whether you are already included, and how competitors are described.',
          ] },
        ],
      },
      {
        heading: 'How do you pitch the author?',
        answer: 'Send a short, specific email: which list, why you fit its criteria, verifiable facts, and an offer of access or a sample. No pressure and no payment for favorable verdicts.',
        body: [
          { ul: [
            'One line on what you are and who you serve.',
            'Two to four verifiable facts: pricing, a differentiating feature, review rating and count, a notable customer.',
            'A link to a page that backs every claim.',
            'An offer of a free account, sample or demo.',
          ] },
          { p: 'If a list is pay-to-be-included, decide case by case and make sure it is disclosed.' },
        ],
      },
      {
        heading: 'How long until AI answers change?',
        answer: 'Usually two to six weeks after the article is updated and recrawled. Re-check the same questions to confirm.',
      },
    ],
    related: ['/guides/why-ai-recommends-your-competitor', '/guides/generative-engine-optimization', '/glossary/citation-gap'],
    published: D,
    updated: D,
  },

  {
    kind: 'guide',
    slug: 'ai-visibility-for-saas',
    title: 'AI Visibility for SaaS: How Software Gets Recommended by AI',
    description: 'The pages, listings and signals that get early-stage SaaS products recommended in ChatGPT, Gemini, Perplexity and Google AI answers.',
    h1: 'AI visibility for SaaS: how software gets recommended by AI',
    answer:
      'SaaS products get recommended by AI when they have clear pages for the questions buyers ask (features, pricing, comparisons, alternatives, integrations, use cases), active profiles and reviews on software review sites such as G2 and Capterra, inclusion in the "best software" articles AI cites, and genuine discussion on Reddit, YouTube and LinkedIn.',
    takeaways: [
      'Comparison and alternatives pages answer the questions AI fans out to most for software.',
      'Public, indexable docs are among the most cited sources for "how to do X in Y" questions.',
      'Review platform presence was linked to about three times higher ChatGPT citation odds in one study.',
      'Early-stage products should start with long-tail, high-intent questions, not head terms.',
    ],
    sections: [
      {
        heading: 'Which pages does a SaaS site need?',
        answer: 'A focused set of pages that each answer one buyer question, built before any blog.',
        body: [
          { table: { head: ['Page', 'Buyer question it answers'], rows: [
            ['Feature pages', '"[tool] with [capability]"'],
            ['Pricing', '"How much does [product] cost?"'],
            ['Use case and industry pages', '"Best [category] for [persona or industry]"'],
            ['Comparison pages', '"[product] vs [competitor]"'],
            ['Alternatives pages', '"[incumbent] alternatives"'],
            ['Integration pages', '"[category] that integrates with [tool]"'],
            ['Docs and help center', '"How do I do X in [product]?"'],
            ['Security and trust', '"Is [product] SOC 2 compliant?"'],
          ] } },
        ],
      },
      {
        heading: 'Which off-site sources matter for software?',
        answer: 'Software review platforms, roundup articles, Reddit, YouTube walkthroughs, LinkedIn and integration marketplaces.',
        body: [
          { ul: [
            'G2, Capterra, GetApp, TrustRadius and Product Hunt profiles, kept complete, with steady real reviews.',
            'The "best [category] software" articles AI cites for your questions.',
            'Founder and team participation on Reddit and LinkedIn, disclosed and genuinely helpful.',
            'Integration partner directories.',
            'Original data: a benchmark or survey others can cite.',
          ] },
        ],
      },
      {
        heading: 'What should an early-stage SaaS do first?',
        answer:
          'Measure the 20 to 40 questions that matter, fix crawl and rendering, publish pricing, two to three comparison pages and the top use-case pages, then get onto the review platforms and lists AI cites. Re-check monthly.',
        body: [{ p: 'That is the scope of the [done-for-you service](/sprint) for [SaaS startups](/for/saas-startups).' }],
      },
    ],
    related: ['/for/saas-startups', '/guides/how-to-rank-in-chatgpt', '/guides/get-listed-in-best-of-articles', '/compare/ai-visibility-tools-vs-done-for-you'],
    published: D,
    updated: D,
  },
];
