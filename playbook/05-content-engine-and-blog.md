# 05. The Content Engine: The Resources Layer

Most visitors come to a site to buy, book, or evaluate. They do not want a cluttered menu full of articles. But search engines and AI need hundreds of pages of real answers to retrieve from.

The solution: a **resources layer** that is *quiet in the design* but *loud to crawlers*. Not in the main navigation, fully linked everywhere else.

---

## 1. The right way to make content "not upfront but there for SEO"

| Do | Never do |
|---|---|
| Put "Resources" (or "Learn") in the footer, not the top nav | Hide content with `display:none`, white text, off-screen positioning, or 1px fonts (cloaking/hidden text: a spam policy violation) |
| Link to articles **contextually** from service, product and pricing pages ("See our full guide to veneer costs") | Serve different content to Googlebot than to users (cloaking) |
| Have hub pages (`/resources`, `/guides`, `/glossary`, `/compare`) that link to every child page | Leave pages orphaned (only in the sitemap, linked from nowhere) |
| Include every indexable page in the XML sitemap | `noindex` the resources layer "to keep it hidden" (then it cannot rank or be cited) |
| Add an HTML sitemap page linked from the footer | Block the resources folder in robots.txt |
| Use accordions/tabs for long FAQs on money pages (indexed content, tidy design) | Load article bodies via client-side JavaScript after click |
| Keep a "Related guides" block at the bottom of money pages | Build a separate "SEO subdomain" full of thin pages |

**The principle:** the content is fully public and real. It is simply placed where buyers do not trip over it, and where crawlers, AI retrieval and curious buyers find it easily. That is good design, not a trick.

---

## 2. Information architecture

```
/                               Homepage (T1)
├── /services/ or /product/     Money pages (T7, T8)
├── /pricing                    (T9)
├── /compare/                   Comparison hub
│   ├── /compare/a-vs-b         (T12)
│   └── /alternatives/x         (T13)
├── /for/                       Use cases / personas (T14, T15)
├── /integrations/              (T16, SaaS)
├── /locations/                 (T10, T11, local)
├── /case-studies/              (T17)
├── /reviews                    (T18)
├── /resources/                 THE RESOURCES HUB (footer-linked)
│   ├── /guides/[topic]         Pillars (T19)
│   ├── /blog/[slug]            How-tos, questions, news (T20, T21)
│   ├── /cost/[service]         Cost guides (T23)
│   ├── /glossary/[term]        Glossary (T22)
│   ├── /research/[report]      Original data (T24)
│   ├── /tools/[tool]           Calculators (T25)
│   └── /templates/[name]       Downloads (T26)
├── /docs/                      Help center (T27, SaaS)
├── /changelog                  (T28)
├── /about, /team/[name], /press, /contact
├── /policies/[name]
└── /sitemap                    HTML sitemap
```

**Rules:**
- Subfolders, not subdomains (`domain.com/blog`, not `blog.domain.com`), to consolidate authority.
- Short, descriptive, lowercase, hyphenated URLs. No dates in URLs (so pages can be refreshed without changing URLs).
- Every page within 3 clicks of the homepage.
- Breadcrumbs everywhere.

---

## 3. Topic clusters (hub and spoke)

Each cluster = 1 pillar + 8 to 30 supporting pages + links to 1 to 3 money pages.

```
                 [Money page: Veneers in South Delhi (T8)]
                                  ▲
                                  │ every spoke links up with intent-matched anchor text
     ┌────────────────────┬───────┴───────┬──────────────────────┐
[Cost guide:        [Pillar: Complete   [Veneers vs        [How long do
 veneers cost        guide to veneers    bonding (T12)]     veneers last (T21)]
 Delhi (T23)]        (T19)]                   ...                 ...
     │                    │
[Glossary:          [Are veneers        [Veneers for       [Veneer aftercare
 composite veneer]   painful (T21)]      crooked teeth]     guide (T20)]
```

**Linking rules:**
- Pillar links to every spoke; every spoke links to the pillar and the money page.
- Spokes link to sibling spokes where relevant (2 to 4 links).
- Anchor text describes the target ("veneer cost in Delhi"), not "click here". Vary it naturally.
- Money pages link down to the 3 to 5 most useful spokes ("Related guides").

### How to choose clusters
1. Take the query universe from [02](02-business-diagnosis.md).
2. Group by topic (usually one topic per major service/product/job-to-be-done).
3. Rank clusters by: revenue of the linked offer x buying intent x gap (BrandPulse missed prompts) / difficulty.
4. Build one cluster completely before starting the next. Depth in one topic beats shallow coverage of ten.

---

## 4. What to publish: the content mix

| Content type | Share of output | Why |
|---|---|---|
| Bottom-of-funnel (cost, comparison, alternatives, "best X for Y", "is X worth it") | 40% | Closest to revenue, most sub-queried by AI in commercial answers |
| Middle (how to choose, guides, use cases, case studies) | 30% | Wins evaluation fan-out, builds trust |
| Top (how-to, what is, glossary) | 20% | Topical authority, entity associations, long-tail |
| Original data, research, tools | 10% | Earns links and mentions, the strongest AI correlate |

**For a new site:** start bottom-of-funnel. Low-volume, high-intent queries are easier to win and actually convert.

---

## 5. The article production spec (every article)

### Before writing
- [ ] Target query + 5 to 15 fan-out sub-questions listed
- [ ] Checked what currently ranks and what AI currently answers (and which sources it cites)
- [ ] Identified the information gain: what will this page have that the current top results do not? (Own data, first-hand experience, expert quote, better structure, local specifics, updated prices.) **If nothing, do not write it.**
- [ ] Author and (for YMYL) reviewer assigned

### Structure
- [ ] H1 = the query in natural language
- [ ] Byline with linked author page, "last updated" date, reviewer for YMYL
- [ ] Answer capsule: 40 to 80 words answering the query directly, right under the H1
- [ ] Key takeaways box (3 to 5 bullets) for long pieces
- [ ] H2s = fan-out questions; each opens with a 1 to 3 sentence direct answer
- [ ] At least one table where comparison or data is involved
- [ ] Numbers with sources; at least one expert quote or first-hand observation
- [ ] Original image, chart or screenshot (with descriptive alt text and a caption)
- [ ] FAQ section with 3 to 8 remaining questions
- [ ] "Sources" list with links to primary sources
- [ ] Contextual links: up to the money page and pillar, across to 2 to 4 siblings
- [ ] Soft CTA relevant to the reader's stage

### After publishing
- [ ] In XML sitemap; submitted / pinged (Search Console URL inspection, IndexNow for Bing)
- [ ] Linked from the hub and from at least 2 existing related pages
- [ ] Shared where the audience is (LinkedIn, relevant community, newsletter)
- [ ] Added to the refresh calendar

---

## 6. Using AI to write: allowed, with rules

Google's position: AI-assisted content is fine; content created *primarily to manipulate rankings at scale with little value* is scaled content abuse, however it was produced.

**Our rules:**
1. AI drafts, humans own. A subject expert edits every piece and adds what AI cannot: first-hand experience, real numbers, real cases, opinions.
2. Never publish more than the team can review properly. Ten excellent pages beat two hundred generic ones.
3. Every page must pass the "information gain" check above.
4. No fabricated statistics, quotes, reviews, or credentials. Ever.
5. Fact-check every number and link before publishing.

---

## 7. Cadence and capacity

| Client capacity | Cadence | Mix per month |
|---|---|---|
| Low (founder only, about 2 h/week) | 2 to 4 pieces/month | 2 bottom-funnel, 1 to 2 updates of existing pages |
| Medium (part-time writer + expert review) | 6 to 10/month | 4 bottom, 2 to 3 middle, 1 to 2 top, 1 refresh batch |
| High (content team) | 15 to 30/month | Full mix + quarterly research + tools |

**Refresh beats new** once a site has 50+ pages: every month, update the 5 pages with the most impressions but declining clicks or citations. Change the substance (new prices, new data, new examples, new sections for new fan-out questions), then update the date.

---

## 8. Content decay and pruning (every quarter)

1. Export all indexable URLs with 12-month clicks, impressions, AI citations (Bing AI Performance report), backlinks.
2. For each page with near-zero traffic and no links:
   - **Improve** if the topic matters (rewrite with information gain),
   - **Merge** into a stronger related page and 301 redirect,
   - **Remove** (410) if it has no value.
3. Thin or overlapping pages drag down how Google judges the whole site. Fewer, stronger pages win.
