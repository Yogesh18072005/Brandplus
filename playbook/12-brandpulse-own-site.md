# 12. Applying the Playbook to BrandPulse Itself

We sell AI visibility. If BrandPulse is not visible when someone asks ChatGPT "best AEO agency for SaaS startups", nothing else we say is credible. Our own site is the first case study.

---

## Diagnosis

```
BUSINESS:      BrandPulse (zerociate.com)
ONE-LINER:     Done-for-you AI visibility for businesses: we measure how often AI
               answers recommend you vs competitors, then fix it.
ARCHETYPE:     E (professional services, non-local) primary; C (SaaS: the audit
               engine) secondary
GEOGRAPHY:     Global, English; first segment early-stage B2B SaaS (US/UK/EU)
MATURITY:      New (domain live Oct 2026, no reviews, no mentions)
COMPETITION:   High and noisy (Profound, Peec AI, Otterly, Zenith Bureau,
               aeoengine.ai, hundreds of "GEO agencies")
PRICE:         Scoped per company (no public prices; founder decision)
DIFFERENTIATOR: Evidence-first audit with real AI quotes; done-for-you fixes;
               monthly like-for-like rechecks
CONTENT CAPACITY: Founder, 3 to 4 h/day total across everything
```

**Strategic read:** as a new brand in a crowded category, head terms like "AEO agency" are out of reach for months. Win in this order: (1) technical and entity foundation, (2) long-tail, high-intent pages specific to our segment ("AI visibility for early-stage SaaS"), (3) original data that only our engine can produce, (4) off-site presence where founders ask for recommendations.

---

## Status (12 October 2026)

**Built:** 50 resources pages from a typed registry (`lib/content/`): 11 guides, 26 glossary terms, 4 comparisons, 3 segment pages, 6 service pages. Plus hubs (`/resources`, `/guides`, `/glossary`, `/compare`, `/for`, `/services`) and `/about`. All server-rendered, with Article/Service/DefinedTerm and BreadcrumbList JSON-LD, canonicals, breadcrumbs, answer capsules and related links. Linked from a footer Resources column (not the top nav). Sitemap generated from the registry; llms.txt points to zerociate.com; auth pages noindexed; organization schema has a stable `@id`. `lib/content/content.test.ts` checks links, brand rules and capsules.

**Still open (needs founder input or real data):**
- Founder/person page and named bylines (needs the founder's name and bio).
- `sameAs` links in Organization schema (needs the real LinkedIn, X, Product Hunt, Crunchbase URLs).
- Brand-vs-competitor pages (`/compare/brandpulse-vs-profound` etc.): need verified, dated competitor facts.
- Original research report (needs an engine run on 100+ brands; costs API budget).
- Case studies (need clients and permission).
- `/tools` is quarantined by founder decision (`lib/flags.ts`), so it is out of the sitemap.
- Off-site plan below: all of it is still to do.

## Technical fixes found in the repo (October 2026)

| Issue | Where | Fix | Priority |
|---|---|---|---|
| `llms.txt` links point to **aeoengine.ai** (a competitor's domain) and to `/login` and `/signup` | `public/llms.txt` | Rewrite with zerociate.com URLs and the real public pages (home, /sprint, /methodology, /tools, resources). Low SEO value, but a wrong-domain file is a credibility bug. | P0 |
| Sitemap includes `/sign-in` and `/sign-up` | `app/sitemap.ts` | Remove auth pages (and add `noindex` to them); add `/tools`; generate entries for every resources page as they ship | P1 |
| Sitemap has no `lastModified` | `app/sitemap.ts` | Add real last-modified dates per page | P2 |
| robots.ts uses a single `*` rule | `app/robots.ts` | Fine for now (allows all AI crawlers). Also disallow `/admin` and `/r/` if client reports must stay private (decide per report consent) | P1 |
| `/r/[id]` client reports | `app/r/[id]` | Default `noindex` (client data, consent). Publish 2 to 3 consented or self-audit reports as indexed sample pages | P1 |
| Brand entity | Site-wide | `Organization` (or `ProfessionalService`) JSON-LD with stable `@id`, `sameAs` to LinkedIn, X, Product Hunt, Crunchbase, Wikidata once created | P1 |

---

## Page plan for zerociate.com (90 days, about 60 pages)

### Core (exists or quick)
| Page | Template | Status |
|---|---|---|
| `/` Home | T1 | Exists; make sure the one-paragraph definition ("BrandPulse is...") is in plain HTML |
| `/sprint` Done for you | T8/T9 | Exists; add "how engagements are priced" (scope factors, typical ranges if founder approves) |
| `/methodology` | T19-style | Exists; strong E-E-A-T asset, link to it everywhere |
| `/tools` Free audit | T25 | Exists; add server-rendered explanation text |
| `/about` | T2 | Build: founder story, why we exist, what we measure and do not claim |
| `/team/[founder]` | T4 | Build |
| `/press` Brand facts | T3 | Build |
| `/contact` | T5 | Build |

### Services (one per buyer phrasing): 7 pages, T8
`/services/ai-visibility-audit`, `/services/answer-engine-optimization`, `/services/generative-engine-optimization`, `/services/chatgpt-visibility`, `/services/google-ai-overviews-optimization`, `/services/perplexity-visibility`, `/services/ai-agent-readiness`

### Segments: 4 pages, T14
`/for/saas-startups` (priority), `/for/ecommerce-brands`, `/for/local-businesses`, `/for/agencies` (white-label later)

### Comparisons and alternatives: 8 pages, T12/T13
`/compare/aeo-vs-seo`, `/compare/geo-vs-seo`, `/compare/aeo-agency-vs-in-house`, `/compare/ai-visibility-tools-vs-done-for-you`, `/compare/brandpulse-vs-profound`, `/compare/brandpulse-vs-peec-ai`, `/alternatives/profound-alternatives`, `/alternatives/otterly-alternatives`
(Factual, dated, fair: say where tools are better, e.g., for enterprises that want self-serve dashboards.)

### Resources hub (footer-linked): about 40 pages
| Type | Pages |
|---|---|
| Pillar guides (T19) | `/guides/answer-engine-optimization`, `/guides/generative-engine-optimization`, `/guides/how-to-rank-in-chatgpt`, `/guides/google-ai-overviews`, `/guides/ai-visibility-for-saas` |
| How-tos and questions (T20/T21) | how to check if ChatGPT recommends your brand; how to get listed in "best X" articles; how to make your site readable by AI crawlers; robots.txt for AI crawlers; how query fan-out works; why AI recommends your competitor; how long AEO takes; does llms.txt work |
| Cost guide (T23) | `/cost/aeo-geo-services` (what agencies and tools charge in 2026, and what drives it) |
| Glossary (T22, about 20 terms) | AEO, GEO, AAO, LLMO, AI Overviews, AI Mode, query fan-out, grounding, citation, share of voice, presence rate, entity, E-E-A-T, llms.txt, OAI-SearchBot, IndexNow, MCP, WebMCP, agentic commerce, zero-click |
| Original research (T24) | **"AI Visibility of Early-Stage SaaS, 2026"**: run the engine on 100 to 200 SaaS brands across categories; publish presence rates, what correlates with visibility, citation-gap domains. This is our mention engine and outreach hook. |
| Free tools (T25) | AI crawler access checker (robots.txt + WAF test), "Is my site readable by AI" (JS rendering check), schema checker |
| Sample reports | 2 to 3 public, consented or self-run audit reports |

### Ongoing cadence (realistic for founder time)
- 2 pieces/week: alternate bottom-funnel (comparison, segment, cost) and education (guide, how-to).
- Quarterly: refresh the research report with new data.
- Monthly: run BrandPulse on BrandPulse (our own 40 "best AEO agency / AI visibility" prompts) and publish the trend in the build-in-public log.

---

## Off-site plan for BrandPulse

1. **LinkedIn**: founder posts 3 to 5x/week: real audit findings (anonymized or consented), before/after, what AI says about well-known SaaS brands. LinkedIn is heavily cited for B2B.
2. **Reddit**: r/SaaS, r/startups, r/SEO, r/bigseo, r/Entrepreneur: answer AI-visibility questions with real data, disclose "I build BrandPulse". No fake accounts (founder decision already made).
3. **Product Hunt launch** for the free audit tool; **Indie Hackers** build-in-public log.
4. **G2 / Capterra** listings once there are paying customers to review.
5. **Listicles**: find every "best AEO tools / GEO agencies / AI visibility tools" article AI cites; pitch with the research report and a free audit of the author's own site.
6. **Podcasts and newsletters** for SaaS founders: pitch the research findings.
7. **Wikidata + Crunchbase** entries with consistent description.
8. **Case studies** from the first 3 to 5 clients (with permission) as the strongest proof.

---

## Product implications (for the fix-plan generator)

This playbook can become the rules engine behind `src/fix-plan.ts`:

1. **Classify the archetype** in business understanding (already partially there via `businessType`). Add the 10 archetypes and modifiers from [02](02-business-diagnosis.md).
2. **Map missed prompts to intent buckets** (the 9 buckets) and from buckets to templates (T1 to T30), so every missed prompt produces a specific page brief ("Build T23 cost guide: veneers cost in Delhi, answer these 8 sub-questions").
3. **Map citation-gap domains to channel actions** ([08](08-off-site-authority.md)): review platform, directory, listicle, forum, media.
4. **Add site checks** for the P0 technical items ([06](06-technical-seo.md)): AI crawler access in robots.txt, server-rendered content (fetch without JS), prices in HTML, schema presence, sitemap.
5. **Add an AAO readiness score** (levels 0 to 5, [09](09-aao-agent-readiness.md)).
6. **Keep the honesty rules** ([11](11-what-not-to-do.md)) in generated copy: no guarantees, illustrative examples labeled.
