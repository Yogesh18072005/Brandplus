# 10. Measurement and the 90-Day Plan

## 1. The scoreboard

Rankings for a handful of keywords are no longer the scoreboard. Measure at four levels.

| Level | Metric | Tool | Cadence |
|---|---|---|---|
| **Foundation** | Indexed pages / submitted pages; crawl errors; CWV pass rate | Search Console, Bing WMT | Weekly during build, then monthly |
| **SEO** | Impressions, clicks, average position for the query universe; non-branded clicks | Search Console, rank tracker | Monthly |
| **AI visibility (GEO/AEO)** | Presence rate, visibility score, share of voice vs competitors, per-engine presence, citation rate (own domain cited), missed high-value prompts | **BrandPulse audit** on the fixed 40-prompt set | Monthly (same prompts, same engines, like-for-like) |
| | Copilot/Bing AI citations, cited pages, grounding queries | Bing WMT AI Performance report | Monthly |
| | AI Overview/AI Mode clicks (inside "Web" totals) | Search Console | Monthly |
| **Business** | Sessions and conversions from AI referrers (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai); branded search volume; leads/bookings/revenue | GA4 or analytics, CRM, Google Trends | Monthly |
| **AAO** | Feed health (disapprovals), agent-sourced orders/bookings, form completion rate | Merchant Center, booking platform, analytics | Monthly |

### Measurement rules
- **Fix the prompt set** before work starts; recheck the same prompts on the same engines. Add new prompts as a separate set so trends stay comparable.
- **Run multiple samples** where budget allows: AI answers vary between runs. Treat a single run as a sample, not truth.
- **Brand demand** (branded search volume) is a lagging indicator of everything working and a leading indicator of AI visibility.
- **Ask new customers** "How did you hear about us?" with "ChatGPT / AI assistant" as an option. Self-reported attribution catches what analytics misses.

---

## 2. The 90-day plan (standard engagement)

### Weeks 1 to 2: Diagnose and fix the foundation
- [ ] Discovery Brief ([02](02-business-diagnosis.md)): archetype, modifiers, competitors, query universe
- [ ] Baseline BrandPulse audit (40 prompts) + export of current Search Console and Bing data
- [ ] Technical audit ([06](06-technical-seo.md)): fix all P0s (crawl blocks, AI bot access, rendering, indexing, canonicals, sitemap)
- [ ] Verify Search Console and Bing Webmaster Tools; enable IndexNow
- [ ] Organization/LocalBusiness schema, `sameAs`, consistent brand description
- [ ] Claim and complete Google Business Profile, Bing Places, Apple Business Connect (local)
- [ ] Off-site: claim/complete the top 5 cited directories and review platforms from the citation gap

### Weeks 3 to 6: Build the money pages
- [ ] Launch set for the archetype ([04](04-archetype-blueprints.md)): service/product pages, pricing, about, team, contact, policies, reviews hub
- [ ] Every page to template spec ([03](03-page-templates.md)) and writing rules ([07](07-aeo-geo-content-engineering.md))
- [ ] Brand facts page
- [ ] Start the review engine (process, links, staff briefed)
- [ ] Listicle outreach: top 10 cited "best X" lists
- [ ] AAO level 2: prices, hours, policies in HTML and schema; forms cleaned up

### Weeks 7 to 10: Build the comparison and resources layer
- [ ] Comparison and alternatives pages; cost guides
- [ ] First full topic cluster: pillar + 8 to 15 spokes, interlinked
- [ ] Resources hub, footer links, HTML sitemap
- [ ] Case studies
- [ ] Reddit/community presence started (named accounts, helpful answers)
- [ ] First 3 to 5 videos for the top buyer questions
- [ ] Feeds (e-commerce): Merchant Center clean, OpenAI feed if eligible

### Weeks 11 to 12: Recheck and report
- [ ] Re-run the BrandPulse audit (same 40 prompts) and compare like-for-like
- [ ] Search Console, Bing AI Performance, AI referral traffic vs baseline
- [ ] Report: what changed, what we shipped, what moved, what did not and why
- [ ] Next-quarter plan: second cluster, original data asset, expanded off-site

### Months 4 onward: the operating rhythm
| Weekly | Monthly | Quarterly |
|---|---|---|
| Publish per cadence; GBP post; respond to reviews; community participation | BrandPulse recheck; refresh 5 pages; outreach batch; technical crawl; report | Original data/research piece; content pruning; competitor "why they win" review; strategy reset |

---

## 3. Client reporting template (monthly)

```
1. Headline: AI visibility [score] (was [x]); presence [a]/40 prompts (was [b]).
   Top competitor: [name] at [c]/40.
2. What moved: prompts newly won (with evidence quotes), engines improved.
3. What we shipped: pages, fixes, listings, reviews gained, outreach wins.
4. Search: impressions, clicks, top new queries. AI referrals and conversions.
5. Still missing: top missed prompts and why (gap analysis).
6. Next month: the 3 to 5 highest-impact actions.
Note: AI answers vary between runs and model updates; we report trends over
repeated, like-for-like checks, not single answers.
```
