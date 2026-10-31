# The BrandPulse Discovery Playbook

How a business gets found, cited, recommended and chosen by search engines (SEO), answer engines (AEO), generative engines (GEO) and AI agents (AAO).

Researched October 2026. Written to be used two ways:

1. **By us, by hand**, when we run an AI Visibility Sprint for a client.
2. **By the product**, as the rulebook the fix-plan generator should follow (business archetype in, page plan and action list out).

---

## How to use this playbook

Run it in this order. Do not skip step 1: every later decision depends on it.

| Step | File | Output |
|---|---|---|
| 1. Understand how discovery works now | [01-how-discovery-works.md](01-how-discovery-works.md) | Shared mental model of the 7-stage pipeline |
| 2. Diagnose the business | [02-business-diagnosis.md](02-business-diagnosis.md) | Archetype + modifiers + query universe |
| 3. Pick the page set | [04-archetype-blueprints.md](04-archetype-blueprints.md) | Exact list of pages to build, in priority order |
| 4. Build each page to spec | [03-page-templates.md](03-page-templates.md) | 30 templates with sections, schema, links |
| 5. Build the content engine | [05-content-engine-and-blog.md](05-content-engine-and-blog.md) | The resources layer (blog, guides, glossary, compare) |
| 6. Make it technically perfect | [06-technical-seo.md](06-technical-seo.md) | Crawl, render, index, speed, schema checklist |
| 7. Write so AI quotes you | [07-aeo-geo-content-engineering.md](07-aeo-geo-content-engineering.md) | Passage-level writing rules |
| 8. Win off-site (the bigger half) | [08-off-site-authority.md](08-off-site-authority.md) | Mentions, reviews, Reddit, PR, listicles |
| 9. Make it usable by agents | [09-aao-agent-readiness.md](09-aao-agent-readiness.md) | Readable, actionable, transactable for AI agents |
| 10. Measure and run the 90 days | [10-measurement-and-90-day-plan.md](10-measurement-and-90-day-plan.md) | KPIs and a week-by-week plan |
| 11. Avoid what gets sites killed | [11-what-not-to-do.md](11-what-not-to-do.md) | Anti-patterns and penalties |
| 12. Apply it to BrandPulse itself | [12-brandpulse-own-site.md](12-brandpulse-own-site.md) | Our own page plan |
| Appendix | [appendix-schema-robots-sources.md](appendix-schema-robots-sources.md) | JSON-LD snippets, robots.txt, all sources |

---

## The four disciplines in one table

| | SEO | AEO | GEO | AAO |
|---|---|---|---|---|
| **Full name** | Search Engine Optimization | Answer Engine Optimization | Generative Engine Optimization | Assistive Agent Optimization |
| **The machine** | Google, Bing ranking 10 blue links | Featured snippets, AI Overviews, voice assistants, People Also Ask | ChatGPT, Gemini, Perplexity, Claude, Copilot, Google AI Mode writing a synthesized answer | AI agents that act: book, buy, compare, fill forms (Gemini in Chrome, ChatGPT agent, Perplexity Comet, shopping agents) |
| **The win** | Rank a page, get the click | Be *the* answer that is extracted and read out | Be *mentioned, cited and recommended* inside the generated answer | Be *selected and transacted with* when the agent completes the task |
| **Unit that competes** | The page | The passage (40 to 300 words) | The entity (your brand) plus passages | The offer + the data + the action endpoint |
| **Main levers** | Crawlability, relevance, links, intent match, UX | Answer-first formatting, question coverage, structured content | Brand mentions across the web, citable facts, third-party consensus, fan-out coverage | Machine-readable prices/availability/policies, feeds, clean forms, protocols (UCP, ACP, MCP) |
| **Measured by** | Rankings, impressions, clicks | Snippet ownership, AIO citations | Presence rate, share of voice, citation rate across engines (what BrandPulse audits) | Agent-sourced sessions, feed-driven orders, bookings |

**The honest framing:** these are not four separate jobs. They are four layers of one pipeline. GEO and AAO sit *on top of* SEO: almost every AI engine retrieves from a search index (Google's, Bing's, or its own crawl) before it writes. A site that is not crawlable and indexable cannot be cited. A brand nobody else talks about will not be recommended even if it is cited. Do all four, in order.

---

## The 15 laws (if you remember nothing else)

1. **Retrieval before generation.** If the page is not crawled and indexed by Google, Bing, and the AI search crawlers (OAI-SearchBot, PerplexityBot, Claude-SearchBot), it does not exist to AI. Fix technical SEO first.
2. **Text in HTML, rendered on the server.** Most AI crawlers and agents do not execute JavaScript. Prices, services, FAQs and key claims must be in the initial HTML.
3. **One page per job.** Every distinct buyer question that matters gets a page (or a clearly headed section) built to answer it. Thin sites lose because they have nothing to retrieve.
4. **Answer first, then prove.** Lead each section with a direct 1 to 3 sentence answer, then the evidence. AI lifts passages, not pages.
5. **Facts beat adjectives.** Numbers, prices, dates, named sources, and quotes raise citation odds (the GEO paper measured roughly 30 to 40 percent lifts from adding statistics, quotations, and citations; keyword stuffing made things worse).
6. **Cover the fan-out.** AI Mode and AI Overviews break one query into many sub-queries. The page that answers the follow-up questions (cost, duration, risks, alternatives, who it is for) wins the sub-query citations.
7. **Brand mentions beat backlinks for AI.** Ahrefs found branded web mentions correlate with AI Overview visibility at 0.664 versus 0.218 for backlinks. Get talked about on the sites AI already trusts.
8. **Third-party consensus beats self-praise.** A "best X" list on your own site ranking yourself first is increasingly ignored (one study: AI Overviews excluded the brand 69 percent of the time when its own listicle was cited). Get onto *other people's* lists.
9. **Be where the engines look.** Reddit, YouTube, Wikipedia, LinkedIn, review platforms (G2, Capterra, Trustpilot, Google reviews, Practo/Justdial in India) dominate AI citations. A brand absent from all of them is invisible.
10. **One consistent entity.** Same name, description, logo, address, founders, and category everywhere, connected with `sameAs` links. AI must be sure who you are before it recommends you.
11. **Fresh, substantively.** AI-cited content skews fresher than organic results (Ahrefs: about 25.7 percent fresher). Update the facts, not just the date stamp.
12. **Every page reachable, nothing orphaned.** The resources layer can live outside the main menu, but it must be linked (footer, hubs, contextual links, sitemaps). An unlinked page is a dead page.
13. **Agents need rules, not vibes.** Clear pricing, availability, shipping, returns, booking slots, and cancellation policies in plain text and structured data. Agents skip businesses whose terms they cannot parse.
14. **Quality at scale, never scale without quality.** Google's scaled content abuse and doorway policies kill mass-produced location or AI pages. Every page needs unique, useful substance.
15. **Nobody can guarantee #1.** AI answers vary by run, user, location, and model version. We maximize the *probability* of being mentioned and recommended, measure it across many prompts, and recheck. Never promise a rank.

---

## Evidence legend used throughout

Every major claim is tagged so we never oversell to a client:

- **[OFFICIAL]** Stated in Google, Bing, OpenAI or other platform documentation.
- **[DATA]** Supported by a large published study (Ahrefs, Peec AI, Similarweb, SE Ranking, the KDD 2024 GEO paper). Correlational unless noted.
- **[CONSENSUS]** Practitioner consensus, consistent across many sources, not formally proven.
- **[EMERGING]** New standard or behavior; build for it, do not bet the client on it.

Sources are listed in the [appendix](appendix-schema-robots-sources.md#sources).
