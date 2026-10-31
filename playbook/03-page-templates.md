# 03. Page Template Library

30 templates. Every page on a client site should be one of these. Each template lists: what it wins, URL pattern, the sections in order, the schema, the internal links, and what agents need from it.

**Rules that apply to every template** (not repeated below):

- One primary intent per page. One H1 that states it in the buyer's words.
- Title tag: primary query first, brand last, about 50 to 60 characters. Meta description: the answer plus a reason to click, about 150 characters.
- First 100 words answer the page's main question directly (the "answer capsule", see [07](07-aeo-geo-content-engineering.md)).
- H2s phrased as the questions buyers ask. Each H2 section opens with a 1 to 3 sentence direct answer.
- Server-rendered HTML. No key content only in images, PDFs, sliders, or client-side JavaScript.
- Visible "last updated" date on anything with facts, prices or advice.
- Author or reviewer with a linked bio on anything advisory (mandatory for YMYL).
- Breadcrumbs (visible + `BreadcrumbList` schema) on everything below the homepage.
- At least 3 contextual internal links in, and 3 out, to related pages. No orphans.
- Structured data must match visible text **[OFFICIAL]**. Never mark up content that is not on the page.
- FAQ accordions are fine: content inside tabs and accordions is indexed. But the answers must be in the HTML, not fetched on click.

---

## Core pages (every business)

### T1. Homepage
- **Wins:** brand queries, the broadest category query, entity understanding ("what is [brand]?").
- **URL:** `/`
- **Sections:** 
  1. H1: what you are + for whom + where (e.g., "Cosmetic dentist in South Delhi for natural-looking smiles"). Not a slogan.
  2. One-paragraph plain description (this is what AI quotes as "X is a..."). Include category, location/market, founding year, key differentiator with a number.
  3. Primary offers grid linking to every service/product category page.
  4. Proof strip: review rating and count (linked to source), notable clients, certifications, press logos (linked to the actual articles).
  5. How it works / process (3 to 5 steps).
  6. Pricing teaser ("from X") linking to pricing.
  7. Who it is for / not for.
  8. 2 to 3 case studies or testimonials with names and specifics.
  9. FAQ (5 to 8 brand-level questions).
  10. Locations / service area (local) or integrations (SaaS).
  11. CTA.
- **Schema:** `Organization` (or `LocalBusiness` subtype) with `name`, `alternateName`, `url`, `logo`, `description`, `foundingDate`, `founder`, `address`, `contactPoint`, `sameAs` (every official profile). `WebSite`. Skip self-serving `aggregateRating` on your own Organization/LocalBusiness: Google does not show stars for it; link to the real review platforms instead.
- **Agents need:** what you sell, where, price range, how to book/buy, hours, contact.

### T2. About / Company page
- **Wins:** "who owns X", "is X legit", "X founded", entity disambiguation.
- **URL:** `/about`
- **Sections:** origin story with dates, founders and leadership (each linked to a person page), mission in one sentence, key numbers (customers, years, locations, team size), credentials and awards, press mentions (linked), company facts table (legal name, founded, HQ, registration numbers where relevant), contact.
- **Schema:** `AboutPage` + `Organization` (same `@id` as homepage) + `Person` for founders.
- **Why it matters for AI:** this is the page that resolves "who is this brand". Consistency here and on LinkedIn, Crunchbase, Wikidata, directories is entity optimization.

### T3. Brand Facts / Press page (the "AI fact sheet")
- **Wins:** gives AI and journalists one clean source of truth.
- **URL:** `/press` or `/brand-facts`
- **Sections:** boilerplate description (50 and 150 word versions), key facts as a definition list (founded, founders, HQ, category, products, pricing model, customers/scale, funding if public), official names and spellings, logos and photos, leadership bios, recent news with links, media contact.
- **Schema:** `Organization`, `NewsArticle` references.
- **Note:** cheap, high leverage, almost nobody does it well.

### T4. Person page (founder, doctor, author, expert)
- **Wins:** "[name] [specialty]", E-E-A-T for every page they author or review, doctor-name queries (archetype J).
- **URL:** `/team/[name]` or `/authors/[name]` or `/doctors/[name]`
- **Sections:** photo, role, credentials (degrees, registrations, licence numbers for regulated professions), experience in years and specifics, specialties, publications and talks (linked), media appearances, articles they wrote/reviewed (auto-listed), profiles (LinkedIn, professional registry).
- **Schema:** `Person` (`jobTitle`, `worksFor`, `alumniOf`, `hasCredential`, `knowsAbout`, `sameAs`). For doctors, `Physician` where appropriate.

### T5. Contact / Booking page
- **Wins:** action intent, "X phone number", "X address", "X timings".
- **URL:** `/contact`, `/book`
- **Sections:** NAP (name, address, phone) as text, map, hours including holidays, booking widget or form, response time promise, directions/parking (local), what to bring / what happens next.
- **Agents need:** a simple HTML form with `<label>`s, no CAPTCHA on the first step if avoidable, a booking URL that works without login, available slots readable, confirmation in text. See [09](09-aao-agent-readiness.md).
- **Schema:** `ContactPage`, `LocalBusiness` with `openingHoursSpecification`.

### T6. Policies (shipping, returns, refunds, cancellation, warranty, privacy, terms)
- **Wins:** agent verification, "X return policy", trust.
- **URL:** `/policies/[name]`
- **Sections:** plain-language summary at the top (window in days, who pays, conditions), then the full policy.
- **Schema:** for e-commerce, `MerchantReturnPolicy` and `OfferShippingDetails` (on the Organization or Offer).
- **Why:** agents verify these before transacting. Missing policies are a top reason agents skip a merchant.

---

## Commercial pages (money pages)

### T7. Service / Product category page (hub)
- **Wins:** bucket 1 ("best X", "X services in [place]") and acts as the hub for a cluster.
- **URL:** `/services` or `/services/[category]`, `/products/[category]`
- **Sections:** H1 with category + location/market, answer capsule (what you offer in this category, for whom, price range), list of every sub-service/product linking to T8, comparison table of sub-options (who each is for, price, duration), why choose us (with numbers), proof, FAQ, CTA.
- **Schema:** `Service` or `CollectionPage` + `ItemList`, `BreadcrumbList`.

### T8. Service detail / Product detail page
- **Wins:** bucket 2 (need-specific), bucket 3 (cost), bucket 9 (action). The single most important template for AI commercial answers (product pages are the most cited page type in ChatGPT commercial answers per 2026 studies).
- **URL:** `/services/[service]` or `/products/[product]`
- **Sections:**
  1. H1: the service/product in buyer words (+ location for local).
  2. Answer capsule: what it is, who it is for, price range, duration/delivery, outcome.
  3. Key facts table: price (or range), time, sessions/specs, warranty/guarantee, availability, location.
  4. Who it is right for / not right for.
  5. Process step by step (what happens, how long).
  6. Results / outcomes with evidence (before/after with consent, case data, specs and benchmarks).
  7. Pricing detail: what is included, what changes the price.
  8. Comparison to alternatives (link to T12 pages).
  9. Risks, side effects, limitations (honesty is a ranking and trust signal; mandatory for YMYL).
  10. Reviews specific to this service/product.
  11. FAQ: 6 to 12 real fan-out questions.
  12. Related services, CTA with booking/buy.
- **Schema:** `Service` (`provider`, `areaServed`, `offers` with `price`/`priceRange`) or `Product` + `Offer` (`price`, `priceCurrency`, `availability`, `shippingDetails`, `hasMerchantReturnPolicy`) + `AggregateRating`/`Review` when genuine and visible.
- **Length:** whatever fully answers it. Typically 1,000 to 2,500 words for services; product pages are shorter but data-rich.

### T9. Pricing page
- **Wins:** bucket 3, high-intent evaluation, agent verification.
- **URL:** `/pricing`
- **Sections:** plans or price list as an HTML table (not an image), what is included, add-ons, billing terms, free trial / consultation terms, discounts, comparison to competitors' pricing (factual, dated), pricing FAQ (refunds, contracts, taxes, currency).
- **Rule:** if pricing is quote-based, publish ranges and the factors that change price. "Contact us for pricing" loses both the AI answer and the agent.
- **Schema:** `Offer` / `PriceSpecification` per plan, or `Product` with `offers`.

### T10. Location page (city / area / branch)
- **Wins:** bucket 8 and local versions of bucket 1.
- **URL:** `/locations/[city]` or `/[city]` or `/locations/[city]/[area]`
- **When to build:** only where the business has a physical location, or genuinely serves the area with something area-specific to say. **[OFFICIAL]** Near-duplicate city pages with swapped place names are doorway pages and violate Google spam policies.
- **Sections (must be unique per location):** address, map, hours, phone for that branch; staff at that branch (linked person pages); services offered there; local photos; directions and landmarks; parking/transit; local reviews (from that branch's GBP); local prices if different; local FAQ ("is there parking near the Saket clinic?"); areas served nearby.
- **Schema:** `LocalBusiness` subtype per branch with its own `@id`, `address`, `geo`, `openingHoursSpecification`, `parentOrganization`.
- **Pair with:** one Google Business Profile per physical location, linking to this page (not the homepage).

### T11. Service x Location page
- **Wins:** "[service] in [area]" for high-value services in priority areas.
- **URL:** `/[city]/[service]` or `/services/[service]/[city]`
- **When to build:** only for the top 3 to 5 services x top locations where there is real local substance (local pricing, local case studies, the doctor at that branch who does it). Start with fewer, better pages. Expand only if they get impressions.

### T12. Comparison page: "[Brand] vs [Competitor]" and "[Option A] vs [Option B]"
- **Wins:** bucket 4. Heavily used in AI fan-out ("X vs Y" is a classic sub-query).
- **URL:** `/compare/[brand]-vs-[competitor]` and `/compare/[option-a]-vs-[option-b]` (e.g., veneers vs bonding)
- **Sections:** verdict in 2 to 3 sentences up top (who should pick which), comparison table (price, features, ratings, best for), section per key difference, where the competitor is better (say it; credibility is the point), migration/switching notes, FAQ, date of last check.
- **Rules:** factual, dated, sourced. Never misrepresent a competitor (legal risk and trust collapse). Category comparisons (option A vs option B) are often more valuable than brand vs brand for local businesses.
- **Schema:** `Article` or `WebPage`; `ItemList` for the compared items.

### T13. Alternatives page: "[Competitor] alternatives"
- **Wins:** bucket 5. Captures people unhappy with a competitor.
- **URL:** `/alternatives/[competitor]-alternatives`
- **Sections:** why people look for alternatives (real reasons from reviews/Reddit), the list (include genuine other options, not just yourself), comparison table, who each is best for, FAQ.
- **Caution:** 2026 data shows self-promotional lists that rank yourself first are losing AI citation share and often do not translate into recommendations. Make it genuinely useful and balanced; the off-site version (other people's lists) matters more.

### T14. "Best X for Y" / Use-case page
- **Wins:** bucket 1 and 2 with a qualifier ("best CRM for real estate agents", "best dentist for anxious patients").
- **URL:** `/for/[persona-or-use-case]` or `/solutions/[use-case]`
- **Sections:** the specific job and pains of this persona, how the product/service solves each (with screenshots, steps), proof from this segment (case study, quote), relevant features/services, pricing for this segment, FAQ.
- **Schema:** `WebPage` / `Service` with `audience`.

### T15. Industry / Persona page (B2B)
- Like T14 but by industry ("[product] for healthcare"). Include compliance, integrations and case studies from that industry.

### T16. Integration page (SaaS)
- **Wins:** "[product] [tool] integration", "CRM that integrates with WhatsApp".
- **URL:** `/integrations/[tool]`
- **Sections:** what the integration does, setup steps, data synced, use cases, limitations, link to docs.
- **Note:** cheap to build at scale *and* genuinely useful because every integration is different. One of the few legitimate programmatic page types.

### T17. Case study
- **Wins:** bucket 6 (evaluation/trust), "[brand] results", gives AI quotable outcomes.
- **URL:** `/case-studies/[client]`
- **Sections:** headline result with a number, client facts (industry, size, location), problem, solution, timeline, results table (before/after with dates), client quote with name and role, what made it work, link to the service used.
- **Schema:** `Article` with `about` and `mentions`.

### T18. Reviews / Testimonials hub
- **Wins:** "is X good", "X reviews".
- **URL:** `/reviews`
- **Sections:** aggregate rating per platform with links (Google, G2, Trustpilot, Practo), selection of real reviews with attribution and date, video testimonials with transcripts, how reviews are collected (transparency), response to criticism.
- **Rule:** never fabricate or gate reviews. Self-serving `AggregateRating` markup for your own organization is not eligible for Google review stars; only use review markup where Google's guidelines allow and the reviews are shown on the page.

---

## Knowledge pages (the resources layer, see [05](05-content-engine-and-blog.md))

### T19. Pillar guide ("The complete guide to X")
- **Wins:** the broad informational head term of a cluster; hub for 10 to 30 supporting articles.
- **URL:** `/guides/[topic]`
- **Sections:** summary box (key takeaways in 5 bullets), table of contents with jump links, sections answering each sub-question with a direct answer first, original data/visuals, expert quotes, links to every cluster article, FAQ, sources.
- **Length:** 2,500 to 6,000 words, only if every section earns its place.

### T20. How-to / Tutorial article
- **Wins:** bucket 7 "how to [do task]".
- **URL:** `/blog/[slug]` or `/learn/[slug]`
- **Sections:** answer capsule (the steps in brief), what you need, numbered steps with screenshots, common mistakes, time/cost, when to get a professional (soft CTA), FAQ.
- **Schema:** `Article` (or `BlogPosting`). HowTo rich results are gone from Google, but step structure in HTML still helps extraction.

### T21. Question article (one question, one page)
- **Wins:** a specific high-volume question ("how long do veneers last", "what is a sales pipeline").
- **Sections:** the answer in the first 1 to 2 sentences, then the nuance (it depends on...), data, expert view, related questions.
- **Note:** only when the question deserves its own page; otherwise make it an H2 on a pillar or service page.

### T22. Glossary term page
- **Wins:** "what is [term]" for category vocabulary. Builds topical authority and entity associations.
- **URL:** `/glossary/[term]` with a `/glossary` index.
- **Sections:** one-sentence definition, longer explanation, example, why it matters, related terms, link to the relevant product/service.
- **Schema:** `DefinedTerm` within a `DefinedTermSet`.
- **Rule:** each term must have real substance (150 to 600 words). No 40-word stubs at scale.

### T23. Cost guide ("How much does X cost in [place/year]")
- **Wins:** bucket 3, very high commercial value, constantly sub-queried by AI.
- **URL:** `/cost/[service]` or `/guides/[service]-cost`
- **Sections:** price range table up top with the date, what drives cost, price by option/tier, hidden costs, how to save, financing/insurance, what you get at each price point, your own price (honestly placed), FAQ.
- **Freshness:** update at least every 6 months; change the numbers, not just the date.

### T24. Original research / statistics page
- **Wins:** citations from other sites and from AI ("according to [brand]'s 2026 survey..."). The strongest earned-mention engine.
- **URL:** `/research/[report]` or `/[topic]-statistics`
- **Sections:** headline findings as numbered stats (each one quotable on its own line), methodology (sample size, dates), charts with text summaries, downloadable data, embed/citation instructions.
- **Schema:** `Dataset` (where it fits), `Article`.

### T25. Free tool / calculator
- **Wins:** "[X] calculator", links and repeat visits, agent utility.
- **URL:** `/tools/[tool]`
- **Sections:** the tool (works without login), explanation of the method, worked example, related guide, CTA.
- **Note:** the explanation must be server-rendered text; the tool can be interactive.

### T26. Template / downloadable resource
- **Wins:** "[X] template", lead capture.
- **Rule:** put a full text preview on the page; do not gate everything behind a form or the page has nothing to index.

### T27. Documentation / Help center article (SaaS, complex products)
- **Wins:** "how to [do X] in [product]", feature questions, and a huge share of AI answers about software.
- **URL:** `/docs/...` or `help.domain.com` (prefer subfolder for authority consolidation)
- **Rule:** public, indexable, fast, versioned. Docs are among the most-cited sources for software questions.

### T28. Changelog / What's new
- **Wins:** freshness signals, "does X support Y yet", feature queries.
- **URL:** `/changelog`
- **Sections:** dated entries, one per release, each linked to the relevant doc.

---

## E-commerce specific

### T29. Collection / Category page
- **Wins:** "[product type]", "[product type] for [need]", "[product type] under [price]".
- **Sections:** H1, 50 to 150 word intro above the grid (who it is for, how to choose), product grid with price/rating/availability in HTML, filters (controlled for crawling, see [06](06-technical-seo.md)), buying-guide section below the grid, FAQ.
- **Schema:** `CollectionPage`, `ItemList`, `BreadcrumbList`.

### T30. Buying guide
- **Wins:** "best [product] for [need]", "how to choose [product]".
- **Sections:** quick picks table (best overall, best budget, best for X) with reasons, how to choose (criteria), detailed picks, comparison table, FAQ.
- **Rule:** include genuine testing details (how you tested, photos, measurements). First-hand experience is what Google's review system and AI look for.

---

## Template-to-intent map

| Intent bucket | Primary templates |
|---|---|
| 1. Category best | T7, T14, T10, off-site lists |
| 2. Need-specific | T8, T14, T15, T16 |
| 3. Cost | T9, T23, T8 |
| 4. Comparison | T12 |
| 5. Alternatives | T13 |
| 6. Evaluation / trust | T18, T17, T2, T3, T4, off-site reviews |
| 7. How-to / education | T19, T20, T21, T22, T27 |
| 8. Local | T10, T11, T5, Google Business Profile |
| 9. Action | T5, T9, T8, T6, merchant feeds |
