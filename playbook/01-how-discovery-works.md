# 01. How Discovery Works in 2026

Before tactics, understand the machine. Every engine, classic or AI, runs some version of the same 7-stage pipeline. A brand can fail at any stage, and a failure at an early stage makes every later stage irrelevant.

```
 1. DISCOVER   ->  2. CRAWL & RENDER  ->  3. INDEX & UNDERSTAND  ->  4. RETRIEVE
 (find the URL)    (fetch the HTML)       (store, map entities)      (pick candidates
                                                                      for a query or
                                                                      sub-query)
        ->  5. RANK / SELECT  ->  6. SYNTHESIZE & CITE  ->  7. ACT
            (order sources,      (write the answer,        (agent books,
             pick passages)       name brands, link)         buys, fills forms)
```

| Stage | What can kill you | Discipline |
|---|---|---|
| 1. Discover | No sitemap, orphan pages, no inbound links, new domain nobody links to | Technical SEO |
| 2. Crawl & render | robots.txt blocks AI crawlers, CDN/WAF blocks bots, content only appears after JavaScript runs | Technical SEO / AAO |
| 3. Index & understand | Thin or duplicate pages, unclear entity (who is this business?), no structured data, inconsistent name/address | SEO / entity work |
| 4. Retrieve | No page or passage that matches the sub-query; content buried in PDFs/images | SEO / AEO |
| 5. Rank / select | Weak authority, no third-party corroboration, outdated facts, poor UX | SEO / GEO |
| 6. Synthesize & cite | Vague marketing copy with nothing quotable; no reviews or mentions to support recommending you | GEO / AEO |
| 7. Act | Prices hidden, booking only by phone, forms broken for agents, no feed, unparseable policies | AAO |

---

## 1. Classic search engines (SEO)

**Google** and **Bing** crawl the web, render pages, index them, and rank results using hundreds of signals. The ones that still matter most:

- **Relevance:** does the page match the query's intent (informational, commercial, transactional, navigational, local)?
- **Quality and helpfulness:** E-E-A-T (experience, expertise, authoritativeness, trust), original information, satisfying the searcher.
- **Authority:** links and mentions from trusted sites; brand demand (people searching your name).
- **Page experience:** Core Web Vitals (LCP at or under 2.5 s, INP at or under 200 ms, CLS at or under 0.1), mobile friendly, HTTPS, no intrusive interstitials.
- **Local signals** for local intent: Google Business Profile relevance, proximity, prominence (reviews, citations).

Why it still matters: **[OFFICIAL]** Google's AI features documentation (updated 10 Dec 2025) says the eligibility requirement for AI Overviews and AI Mode is simply that a page is indexed and eligible to show a snippet, and that the best practices are standard SEO best practices. Copilot grounds in the Bing index. ChatGPT search and Perplexity run their own crawlers plus search partners. **SEO is the entry ticket to every AI surface.**

---

## 2. Answer engines (AEO)

Answer engines extract a single answer instead of showing a list:

- Google featured snippets and People Also Ask
- Google **AI Overviews** (AIO): a generated summary at the top of results
- Voice assistants (Siri, Alexa, Google Assistant / Gemini voice)

How they choose: **[DATA]** AI Overviews are passage-based. They cite specific passages, not whole pages, and lean on informational queries. Their correlation with organic ranking has weakened: one early-2026 report found about 62 percent of AIO citations came from pages outside the organic top 10.

What wins AEO: a clearly headed section whose first sentence directly answers the question, followed by structured support (list, table, steps), on a page Google already trusts.

---

## 3. Generative engines (GEO)

ChatGPT (with search), Gemini, Google AI Mode, Perplexity, Claude, Copilot. They write a new answer, often naming several brands, sometimes with links.

### How a generative answer is built

1. **Query understanding.** The model rewrites the user prompt, often personalizing it with location and history.
2. **Query fan-out. [OFFICIAL for Google]** Google says AI Mode and AI Overviews may issue multiple related searches across subtopics and data sources. "Best cosmetic dentist in Delhi" becomes sub-queries like *veneers cost Delhi*, *cosmetic dentist reviews South Delhi*, *how to choose a cosmetic dentist*, *Clove Dental vs Sabka Dentist*. Follow-up questions in AI Mode trigger more fan-out rounds.
3. **Retrieval.** Candidate pages come from a search index (Google's, Bing's, or the engine's own crawl) plus structured sources (Business Profiles, Merchant Center, Shopping Graph, Knowledge Graph, product feeds).
4. **Passage selection.** The model reads chunks and picks the ones that answer each sub-question best. **The winning passage often answers a sub-question, not the headline query.**
5. **Synthesis.** It writes an answer, blending retrieved passages with what the model already "knows" from training data.
6. **Citation and recommendation.** It links to sources and names brands. **Citation is not recommendation**: a page can be cited as a source while the brand is not recommended.

### Two kinds of AI "memory" you must influence

| | Training-data memory | Live retrieval |
|---|---|---|
| What it is | What the model learned about your brand when it was trained | What it finds on the web right now for this query |
| How fast it changes | Months to a year+ (new model versions) | Days to weeks (as pages are crawled) |
| How to influence | Be widely and consistently mentioned across the web, Wikipedia/Wikidata, reputable media, Reddit, review sites, for a long time | Indexable, answer-first pages; fresh facts; presence on sources the engine retrieves |
| Evidence | **[DATA]** one source found about 29 percent of ChatGPT citations reference content from 2022 or earlier: old authority still anchors answers | **[DATA]** Ahrefs: AI-cited content is about 25.7 percent fresher than organic results |

### Engines are different. Optimize for all, measure per engine.

| Engine | Where it retrieves | What it tends to cite | Notes |
|---|---|---|---|
| **Google AI Overviews** | Google index, passage-level | YouTube, Reddit, Wikipedia, strong informational pages | Low overlap with AI Mode: **[DATA]** Ahrefs found only 13.7 percent URL overlap across 730k responses |
| **Google AI Mode** | Google index with heavy fan-out, Shopping Graph, Business Profiles | More sources per answer (about 12 links on average), Reddit, YouTube, Wikipedia | Conversational, follow-ups trigger more retrieval |
| **Gemini app** | Google Search grounding | Similar to AI Mode | BrandPulse's current audit engine |
| **ChatGPT search** | OAI-SearchBot index plus search partners; merchant product feeds | Wikipedia and Reddit lead (each roughly 12 to 13 percent of US citations per Similarweb), product pages heavily for commercial queries | **[DATA]** brand search volume is one of the strongest predictors of ChatGPT visibility (Kevin Indig, Growth Memo) |
| **Perplexity** | Own crawler (PerplexityBot) + web search | YouTube leads (about 31 percent per an Ahrefs-based report), Reddit, review sites | Always shows citations, rewards fresh, specific pages |
| **Microsoft Copilot** | Bing index | Bing-ranking pages, LinkedIn | Bing Webmaster Tools now has an AI Performance report (public preview Feb 2026) showing citations and grounding queries |
| **Claude** | Brave/own search tools, Claude-SearchBot | Varies | Growing in B2B research use |

**[DATA]** Only about 11 percent of domains are cited by both ChatGPT and Perplexity in one 680M-citation analysis. A client can be strong on one engine and invisible on another. This is exactly why BrandPulse measures presence per engine.

### What correlates with being recommended (ranked by evidence strength)

1. **Branded web mentions** (0.664 correlation with AIO visibility vs 0.218 for backlinks, Ahrefs 75k brands) **[DATA]**
2. **Brand search demand** (people searching your name) **[DATA]**
3. **Presence on review platforms** (SE Ranking: domains with active G2/Capterra/Trustpilot profiles about 3x more likely to be cited by ChatGPT) **[DATA]**
4. **Presence on the high-citation domains** for your category (Reddit, YouTube, Wikipedia, LinkedIn, niche directories, top listicles) **[DATA]**
5. **Organic ranking and indexability** (prerequisite, weaker correlation than before) **[OFFICIAL + DATA]**
6. **Citable content**: statistics, quotations, named sources, clear structure (GEO paper, KDD 2024) **[DATA, lab setting]**
7. **Freshness** of substantive facts **[DATA]**
8. **Product and transactional pages** for commercial queries (ChatGPT's citation mix skews toward product pages: about 24 to 33 percent of classified citations in 2026 studies) **[DATA]**
9. **Structured data and entity consistency** (helps understanding; Google says no *special* schema is needed for AI features) **[OFFICIAL + CONSENSUS]**

---

## 4. Assistive agents (AAO)

Agents do things: "book me a cleaning appointment this Saturday under 3,000 rupees", "buy the best running shoes for flat feet under $150", "find three CRM tools with a free tier and HubSpot import and start a trial on the best one".

Agents in 2026: Gemini agentic browsing in Chrome (rolled out in the US from January 2026), ChatGPT agent and its built-in browser, Perplexity Comet, shopping agents inside Google AI Mode and ChatGPT, plus custom agents built on MCP.

### The agent's decision pipeline

```
Understand task -> Shortlist (uses GEO-style retrieval) -> Verify constraints
(price, availability, location, policy, ratings) -> Choose -> Act (form,
cart, booking, API/protocol) -> Confirm
```

An agent drops a business at the **verify** step if it cannot read the price, stock, hours, service area, or policy, and at the **act** step if it cannot complete the form or checkout. That is the core of AAO: **be shortlistable, be verifiable, be operable.**

### The protocol layer **[EMERGING]**

| Protocol | Who | What it does |
|---|---|---|
| **MCP** (Model Context Protocol) | Anthropic, now Linux Foundation's Agentic AI Foundation | Standard way for agents to call tools and data. A business can expose an MCP server (search inventory, check availability, book). |
| **WebMCP** | W3C Community Group proposal, Google and Microsoft engineers; Chrome origin trial | Lets a website declare its actions (forms, JS functions) as tools that in-browser agents can call (`navigator.modelContext`). |
| **NLWeb** | Microsoft | Makes site content queryable in natural language, built on Schema.org and RSS. |
| **UCP** (Universal Commerce Protocol) | Google with Shopify; spec public Jan 2026 | Discovery, cart, checkout, orders for agent shopping in Search and Gemini. |
| **ACP** (Agentic Commerce Protocol) | OpenAI and Stripe; launched Sept 2025 | Product discovery and checkout in ChatGPT. Reports conflict on whether in-chat Instant Checkout continues; verify before building. |
| **AP2** (Agent Payments Protocol) | Google-originated | Cryptographic proof that the user authorized a purchase. |

For most clients in 2026, AAO means: **clean HTML and structured data, complete merchant feeds (Google Merchant Center, OpenAI product feed), clear policies, and agent-friendly booking and forms.** Protocol work is done through the platform (Shopify, booking tools) rather than built by hand, unless the client is large.

---

## 5. What this means for strategy

- **On-site work (pages, technical, schema)** makes you *retrievable and quotable*. It is necessary, not sufficient.
- **Off-site work (mentions, reviews, community, PR, listicles)** makes you *recommendable*. For AI visibility this is at least half the outcome, often more.
- **Agent readiness** makes you *selectable and transactable*. It is the fastest-growing layer.
- **Measurement across many prompts and engines** is the only honest way to know if any of it works. Rankings for one keyword are no longer the scoreboard.
