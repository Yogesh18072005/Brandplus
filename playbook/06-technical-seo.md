# 06. Technical SEO: The Complete Checklist

Technical SEO decides stages 1 to 3 of the pipeline (discover, crawl and render, index). If any item marked **P0** fails, nothing else in this playbook works.

Priority: **P0** = blocks visibility, fix this week. **P1** = significant impact, fix this month. **P2** = improvement.

---

## 1. Crawl access

| # | Check | Priority | How |
|---|---|---|---|
| 1.1 | `robots.txt` exists, returns 200, does not block important sections | P0 | Fetch `/robots.txt`; Search Console robots report |
| 1.2 | Search and AI-search crawlers are allowed (see table below) | P0 | Check robots.txt user-agent groups |
| 1.3 | CDN / WAF / bot protection (Cloudflare, Vercel firewall, Akamai) is not blocking verified crawlers | P0 | Check firewall logs; Cloudflare's AI crawler settings; test fetch with crawler user agents; check server logs for 403s to bots |
| 1.4 | No important pages behind login, geo-blocks, or cookie walls | P0 | Fetch as a logged-out user from another country |
| 1.5 | XML sitemap at `/sitemap.xml` (or index), referenced in robots.txt, only canonical 200 indexable URLs, `lastmod` accurate | P0 | Search Console sitemaps report |
| 1.6 | Server responds fast and reliably (TTFB under about 600 ms, no 5xx under crawl) | P1 | Logs, uptime monitor, Search Console crawl stats |
| 1.7 | Bing Webmaster Tools verified, sitemap submitted, **IndexNow** enabled for instant change pings (Bing, Yandex, others) | P1 | BWT; most CMSs/CDNs have IndexNow plugins |

### Crawler policy (recommended default for clients who want AI visibility)

| User agent | Owner | Purpose | Recommendation |
|---|---|---|---|
| `Googlebot` | Google | Search, AI Overviews, AI Mode | **Allow** (blocking removes you from Google and its AI features) |
| `Google-Extended` | Google | Control token for Gemini training and grounding in some non-Search products. Does **not** affect Search or AI Overviews. | Allow for maximum Gemini visibility; blocking is a training/licensing choice |
| `Bingbot` | Microsoft | Bing, Copilot grounding | **Allow** |
| `OAI-SearchBot` | OpenAI | ChatGPT search index | **Allow** (blocking removes you from ChatGPT search results) |
| `ChatGPT-User` | OpenAI | Fetches pages when a user/agent asks; robots.txt may not apply | Allow |
| `GPTBot` | OpenAI | Model training | Client's choice; allowing helps future model memory of the brand |
| `PerplexityBot` | Perplexity | Perplexity index | **Allow** |
| `Perplexity-User` | Perplexity | User-initiated fetches | Allow |
| `Claude-SearchBot` | Anthropic | Claude search index | **Allow** |
| `Claude-User` | Anthropic | User-initiated fetches | Allow |
| `ClaudeBot` | Anthropic | Training | Client's choice |
| `Applebot` / `Applebot-Extended` | Apple | Siri, Spotlight, Apple Intelligence; Extended controls training use | Allow / client's choice |
| `CCBot` | Common Crawl | Open dataset used by many model trainers | Client's choice; allowing spreads brand into training data |
| `Meta-ExternalAgent` | Meta | Meta AI | Client's choice |

**For a business that wants to be recommended by AI, the default is allow all reputable search and AI crawlers.** Blocking training bots is a legitimate content-licensing decision for publishers, but for most businesses it reduces how well future models know the brand. Verify current user-agent names in each vendor's docs before shipping; they change. Template in the [appendix](appendix-schema-robots-sources.md#robotstxt-template).

---

## 2. Rendering (critical for AI)

| # | Check | Priority |
|---|---|---|
| 2.1 | All primary content (headings, body, prices, FAQs, product data, reviews, internal links) is in the **initial server HTML** (SSR or static generation) | P0 |
| 2.2 | Test: `curl -A "OAI-SearchBot" https://site.com/page` and view-source both show the full content | P0 |
| 2.3 | Navigation uses real `<a href>` links, not `onClick` handlers or buttons | P0 |
| 2.4 | No content that only appears after scroll, click, or hover via JS fetch (lazy-load images fine; lazy-load *text* not fine) | P1 |
| 2.5 | Single-page apps: pre-render or SSR every indexable route; unique URL per view | P0 |
| 2.6 | Google URL Inspection "View crawled page" shows complete rendered HTML | P1 |

Why: Google renders JavaScript (with delay); **most AI crawlers and many agents do not execute JavaScript** **[CONSENSUS, widely reported]**. A React site that renders on the client can be invisible to ChatGPT, Perplexity and Claude even while it ranks on Google.

---

## 3. Indexing control

| # | Check | Priority |
|---|---|---|
| 3.1 | Every important page returns 200, is indexable (no stray `noindex` meta or `X-Robots-Tag`), and is in Search Console "Indexed" | P0 |
| 3.2 | Self-referencing `rel="canonical"` on every indexable page; duplicates canonicalize to the main version | P0 |
| 3.3 | One version of the site: HTTPS, one host (www or non-www), trailing slash consistent; all others 301 to it | P0 |
| 3.4 | Thin/utility pages noindexed (internal search results, filters with no demand, cart, account, thank-you pages, tag archives with no value) | P1 |
| 3.5 | No `nosnippet` / `max-snippet:0` on pages you want quoted (these block AI Overview/AI Mode use of the content) **[OFFICIAL]** | P0 |
| 3.6 | Soft 404s fixed; removed pages return 404/410 or 301 to the closest relevant page | P1 |
| 3.7 | Redirect chains under 2 hops; no redirect loops | P1 |
| 3.8 | Pagination uses crawlable links; each paginated page self-canonical | P2 |
| 3.9 | Faceted navigation: only facets with search demand are indexable (and get unique titles/intro text); others use noindex or are not linked crawlably; parameters controlled | P1 (e-commerce/marketplace P0) |
| 3.10 | International: `hreflang` for each language/region version with return tags and `x-default`; localized content (not just currency swap) | P1 if multi-region |

---

## 4. Site architecture and internal linking

| # | Check | Priority |
|---|---|---|
| 4.1 | Every indexable page within 3 clicks of home | P1 |
| 4.2 | Zero orphan pages (crawl the site and compare to sitemap) | P1 |
| 4.3 | Hubs link to all children; children link to hub and siblings ([05](05-content-engine-and-blog.md)) | P1 |
| 4.4 | Descriptive anchor text | P1 |
| 4.5 | Breadcrumbs visible + `BreadcrumbList` schema | P1 |
| 4.6 | Footer links to: resources hub, key service hubs, locations, policies, HTML sitemap | P1 |
| 4.7 | Money pages receive the most internal links (check with a crawler's "inlinks" report) | P1 |
| 4.8 | Broken internal links fixed (crawl monthly) | P1 |

---

## 5. On-page elements

| # | Check | Priority |
|---|---|---|
| 5.1 | Unique `<title>` per page, primary query first, about 50 to 60 chars | P0 |
| 5.2 | Unique meta description per page, about 140 to 160 chars | P1 |
| 5.3 | One H1; logical H2/H3 hierarchy; headings are descriptive (questions where natural) | P1 |
| 5.4 | Images: descriptive file names, `alt` text, `width`/`height` set, modern formats (WebP/AVIF), compressed | P1 |
| 5.5 | Open Graph and Twitter card tags (titles/images used when links are shared and by some AI previews) | P2 |
| 5.6 | `lang` attribute on `<html>` | P1 |
| 5.7 | Visible publish and updated dates on content pages; `datePublished`/`dateModified` in schema matching them | P1 |
| 5.8 | Semantic HTML: `<main>`, `<article>`, `<nav>`, `<header>`, `<footer>`, real `<table>` for tabular data, `<ol>/<ul>` for lists | P1 (helps AI chunking) |

---

## 6. Page experience and performance

| Metric (75th percentile of real users) | Good | Priority |
|---|---|---|
| **LCP** Largest Contentful Paint | at or under 2.5 s | P1 |
| **INP** Interaction to Next Paint | at or under 200 ms | P1 |
| **CLS** Cumulative Layout Shift | at or under 0.1 | P1 |

Plus:
- Mobile-friendly, responsive, readable text without zoom, tap targets spaced (Google indexes mobile-first) **P0**
- HTTPS everywhere, valid certificate, no mixed content **P0**
- No intrusive interstitials (full-screen popups on arrival, especially on mobile) **P1**
- Common wins: preload the LCP image, serve images via CDN at the right size, defer non-critical JS, remove unused third-party scripts (chat widgets, trackers), font-display swap, cache HTML at the edge.

Measure with Search Console Core Web Vitals report and PageSpeed Insights (field data), not only lab scores.

---

## 7. Structured data (schema.org JSON-LD)

**[OFFICIAL]** Google says no special schema is needed for AI Overviews or AI Mode, and structured data must match visible content. Schema still helps: it removes ambiguity about entities, prices, locations, and products for every engine and agent, powers rich results and merchant listings, and is the foundation NLWeb and agents build on.

| Page | Schema types |
|---|---|
| Sitewide (homepage) | `Organization` or `LocalBusiness` subtype (`Dentist`, `LegalService`, `Store`...) with a stable `@id`, `WebSite` |
| Every page below home | `BreadcrumbList` |
| About / Team | `AboutPage`, `Person` |
| Service pages | `Service` with `provider` (link to Organization `@id`), `areaServed`, `offers` |
| Product pages | `Product`, `Offer` (`price`, `priceCurrency`, `availability`, `shippingDetails`, `hasMerchantReturnPolicy`), `AggregateRating`/`Review` if genuine and visible |
| Location pages | `LocalBusiness` subtype per branch with `address`, `geo`, `openingHoursSpecification`, `parentOrganization` |
| Articles | `Article` / `BlogPosting` with `author` (Person with URL), `datePublished`, `dateModified`, `publisher` |
| FAQ sections | `FAQPage` is optional: Google retired FAQ rich results on 7 May 2026, but leaving the markup is harmless and other engines may use it. Do not expect a visual benefit in Google. |
| Glossary | `DefinedTerm`, `DefinedTermSet` |
| Courses | `Course`, `CourseInstance` |
| Events | `Event` |
| Videos | `VideoObject` (with transcript on page) |
| Software | `SoftwareApplication` with `offers`, `operatingSystem`, `applicationCategory` |
| Datasets | `Dataset` |

**Entity linking:** give the Organization a stable `@id` (for example `https://domain.com/#organization`) and reference it from every page's `publisher`/`provider`. Use `sameAs` to every official profile (LinkedIn, Wikidata, Crunchbase, GBP/Maps URL, G2, YouTube, Instagram, X). This is how engines confirm "this website = this entity".

Validate with Google's Rich Results Test and the Schema.org validator. Snippets in the [appendix](appendix-schema-robots-sources.md).

---

## 8. Optional AI-specific files

| File | Status | Recommendation |
|---|---|---|
| `llms.txt` | **[DATA]** Google says it does not use it; Ahrefs log data (May 2026) found 97% of llms.txt files received zero requests | Optional, low priority. Cheap to add as a clean index of key pages; never a substitute for the work above. Do not sell it to clients as a visibility lever. |
| Markdown versions of docs (`/page.md`) | Useful for developer docs that coding agents read | P2, SaaS with docs only |
| RSS/Atom feeds | Used by NLWeb and some aggregators | P2, cheap |

---

## 9. Monitoring

- **Google Search Console:** indexing, queries, Core Web Vitals, manual actions, security issues. AI Overview and AI Mode clicks are included in the Performance report under "Web" **[OFFICIAL]**.
- **Bing Webmaster Tools:** indexing, IndexNow, and the **AI Performance report** (citations in Copilot and Bing AI summaries, cited pages, grounding queries) **[DATA, public preview since Feb 2026]**.
- **Server logs:** crawl frequency by bot (Googlebot, Bingbot, OAI-SearchBot, PerplexityBot, Claude-SearchBot), 4xx/5xx served to bots, pages never crawled.
- **Monthly site crawl** (Screaming Frog, Sitebulb, or similar): broken links, orphans, duplicate titles, missing canonicals, redirect chains, depth.

---

## 10. Platform notes

| Platform | Watch out for |
|---|---|
| WordPress | Plugin bloat (speed), duplicate archives (tags, author, date: noindex), use one SEO plugin, caching |
| Shopify | Duplicate product URLs via collections (canonicals handle it, keep internal links to canonical), limited URL control, enable agentic/AI channels, use Merchant Center integration |
| Webflow / Framer | Generally good SSR; check CMS collection pages for thin templates; set canonicals; custom schema via embed |
| Wix / Squarespace | Fine for small local sites; limited control over schema and speed |
| Next.js / React | Use server components / SSR or static generation for every indexable route; generate metadata, sitemaps and robots via the framework's built-in APIs; check that content is in the initial HTML; avoid client-only data fetching for content |
| Headless CMS | Preview/staging environments must be noindexed and password protected so they are not indexed as duplicates |
