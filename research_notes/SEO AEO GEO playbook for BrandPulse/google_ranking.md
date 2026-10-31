# How Google Search Crawls, Indexes and Ranks Pages (as of late 2026), including AI Overviews and AI Mode

Notes compiled 2026-10-23. Labels used: **[CONFIRMED]** = Google docs or official statements, sworn testimony, or court record. **[LEAK]** = 2024 Content Warehouse API docs (attribute exists; weight and current use unknown). **[STUDY]** = third-party correlation or data study. **[OPINION]** = industry interpretation. Items marked *(from prior knowledge, not re-fetched this session)* were not re-verified live. The writer should treat them as lower-confidence or verify the linked primary URL.

---

## 1. Crawling, indexing, serving and the named ranking systems

### Takeaway
Google describes a three-stage pipeline: crawl, index, serve. Ranking is done by many named "systems". Its December 2025 guide lists 17 active systems. Helpful Content, Panda and Penguin are retired as standalone systems and now live inside "core ranking systems." Core systems therefore reward people-first, original, reliable content, and spam systems demote policy violations.

### Cited Findings
- **[CONFIRMED]** Ranking systems guide (last updated 10 Dec 2025). Active systems and what each rewards:
  - BERT: understanding word combinations and intent.
  - Crisis information: hotlines and SOS alerts.
  - Deduplication: one of several near-identical results; featured snippet URLs are not repeated.
  - Exact match domain: limits credit to domains built to match a query.
  - Freshness: newer content for queries that expect it.
  - Link analysis & PageRank: links used to understand what pages are about and how helpful they are.
  - Local news: Top stories and Local news.
  - MUM: specific applications only, "not general ranking."
  - Neural matching: concepts.
  - Original content: original reporting is favored over pages citing it.
  - Removal-based demotion: sites with many copyright or personal-info removals.
  - Passage ranking: individual sections of a page.
  - RankBrain.
  - Reliable information: promote authoritative pages, demote low quality.
  - Reviews system: "insightful analysis and original research … by knowledgeable writers."
  - Site diversity: generally no more than 2 listings per site.
  - Spam detection incl. SpamBrain.
  - Retired: Helpful content system (folded into core, March 2024), Hummingbird (2013), Panda (core in 2015), Penguin (core in 2016).
  — [Google ranking systems guide](https://developers.google.com/search/docs/appearance/ranking-systems-guide)
- **[CONFIRMED]** The local ranking system is not on the guide. It is described separately as relevance, distance and prominence (see §5). — [Google Business Profile Help](https://support.google.com/business/answer/7091)
- **[CONFIRMED]** Site reputation abuse is a spam policy, not a ranking system. It covers third-party pages hosted on a trusted site to exploit that site's ranking signals. It was announced in March 2024 and enforced from May 2024. On 19 Nov 2024 it was clarified: first-party involvement or oversight does not exempt such content. *(from prior knowledge)* — [Google Search Central blog, Nov 2024](https://developers.google.com/search/blog/2024/11/site-reputation-abuse); [March 2024 core update & spam policies](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)
- **[CONFIRMED]** Crawling basics. Googlebot discovers URLs via links and sitemaps. It renders JavaScript with an evergreen Chromium. Indexing analyses content, picks a canonical among duplicates and stores signals. Serving returns the "highest quality, most relevant" results for the query, location, language and device. Google does not guarantee crawling, indexing or serving, and does not accept payment to rank. *(from prior knowledge)* — [How Search works](https://developers.google.com/search/docs/fundamentals/how-search-works)
- **[CONFIRMED]** Crawling after changes "can take anywhere from several days to several months." — [Google AI features page](https://developers.google.com/search/docs/appearance/ai-features)

### Inferences
- For an SMB, the practical levers map onto these systems: original, first-hand content (original content, reviews, core systems); topical relevance at page and passage level (neural matching, passage ranking); links and mentions (link analysis); freshness where queries expect it; no spam tactics.
- "Helpful content" no longer refers to a separate site-wide classifier that can be recovered from in isolation. It is part of core, so recovery happens at core updates.

### Gaps
- Google publishes no weights. The guide names systems but not their relative importance.

---

## 2. What the 2024 Content Warehouse leak and US v. Google revealed

### Takeaway
The leak and the trial testimony agree on one thing: Google uses user-interaction (click) data in ranking via NavBoost/Glue. Sworn testimony confirms it, which contradicts years of Google public messaging. The leak also shows site-level attributes such as siteAuthority, site focus and radius, hostAge and Chrome-derived fields. Their weights and whether they are currently used are unknown.

### Cited Findings
- **[CONFIRMED]** Leak timeline:
  - ~13 Mar 2024: Google's `yoshi-code-bot` committed Content Warehouse API docs to a public GitHub repo.
  - 7 May 2024: the files were removed (copies were already on Hexdocs).
  - Erfan Azimi passed them to Rand Fishkin. Fishkin and Mike King (iPullRank) published on 27–28 May 2024.
  - Google confirmed authenticity on 29 May 2024, warning against "out-of-context, outdated, or incomplete information."
  — [Wikipedia: 2024 Google Search documentation leak](https://en.wikipedia.org/wiki/2024_Google_Search_documentation_leak)
- **[LEAK]** Scale: ~2,596 modules and 14,014 attributes. — [Hobo Web analysis](https://www.hobo-web.co.uk/the-google-content-warehouse-leak-2024/)
- **[LEAK]** Named attributes:
  - NavBoost with `goodClicks`, `badClicks`, `lastLongestClicks`.
  - Chrome fields `ChromeInTotal`, `chrome_trans_clicks`.
  - `siteAuthority`.
  - `hostAge` (read by analysts as sandbox-like treatment of new content).
  - Topical-coherence fields `siteFocusScore`, `siteRadius`, `site2vecEmbeddingEncoded` in `QualityNsrNsrData`.
  - Author-as-entity data.
  - The leak does not show weights or whether attributes are still used.
  — [Wikipedia](https://en.wikipedia.org/wiki/2024_Google_Search_documentation_leak)
- **[OPINION]** Fishkin and others argue the leak contradicts Google's past denials on:
  - click signals and Chrome data,
  - a site-level authority metric,
  - a sandbox,
  - domain age.
  — [Wikipedia](https://en.wikipedia.org/wiki/2024_Google_Search_documentation_leak); [Hobo Web](https://www.hobo-web.co.uk/the-google-content-warehouse-leak-2024/)
- **[CONFIRMED, sworn testimony]** Google VP Pandu Nayak testified in the DOJ trial (Oct 2023) that click data had been used in ranking since ~2005 via NavBoost. — [Wikipedia](https://en.wikipedia.org/wiki/2024_Google_Search_documentation_leak). NavBoost is mentioned 84 times in the leak and ~54 times in Nayak's testimony per one count. — [OuterBox](https://www.outerboxdesign.com/articles/googles-navboost-algorithm-highlight-from-leaked-google-search-api)
- **[CONFIRMED, DOJ exhibits]**
  - NavBoost measures how often users, segmented by location and device, click a document for a query. It uses the most recent 13 months of data; before 2017 it used 18 months.
  - Nayak called Glue "just another name for Navboost that includes all of the other features on the page" (SERP features).
  - RankEmbed is listed as one of Google's primary LLM-trained signals.
  — [Search Engine Land: ABCs of Google ranking signals](https://searchengineland.com/google-abc-ranking-signals-455360); [Resoneo leak part 5](https://www.resoneo.com/google-leak-part-5-click-data-navboost-glue-and-beyond-google-is-watching-you/); [DOJ exhibit](https://www.justice.gov/atr/media/1398866/dl)
- **[CONFIRMED, DOJ exhibits; via secondary]** Further details from Search Engine Land's reading of the 2025 remedies-phase exhibits:
  - "ABC" signals (Anchors, Body, Clicks) feed topicality.
  - A query-independent quality score is referred to as Q*.
  - Google engineers prefer "hand-crafted" signals they can debug over opaque ML.
  - "Traditional signals" likely means user-side data.
  The SEL page returned 403 when fetched, so the interpretation could not be directly verified this session. *(partly from prior knowledge)* — [Search Engine Land](https://searchengineland.com/google-abc-ranking-signals-455360)
- **[CONFIRMED, court record]** Judge Amit Mehta ruled Google an unlawful monopolist in general search (5 Aug 2024). Remedies opinion (2 Sep 2025):
  - no forced Chrome divestiture;
  - bans exclusive distribution contracts;
  - requires sharing certain search index and user-interaction data with qualified competitors.
  *(from prior knowledge)* — [Wikipedia: United States v. Google LLC (2020)](https://en.wikipedia.org/wiki/United_States_v._Google_LLC_(2020))
- **[LEAK / OPINION]** "Twiddlers" (re-ranking functions applied after primary ranking, e.g. for freshness and diversity) were described in Mike King's analysis. The Wikipedia summary does not cover them. *(from prior knowledge)* — [iPullRank: Secrets from the algorithm](https://ipullrank.com/google-algo-leak)

### Inferences
- Real user satisfaction on the SERP is a ranking input: being clicked and not bounced back ("long clicks"). Brand recognition that earns clicks therefore compounds. This supports BrandPulse messaging that brand demand and searcher satisfaction matter, not only on-page SEO.
- Site-level signals (authority, topical focus) mean a tightly focused SMB site with one clear topic likely beats a sprawling generalist site at equal page quality. This is inferred from attribute names only.

### Gaps
- No public source gives weights or current usage of leaked attributes. Claims like "siteAuthority = Moz DA" are speculation.
- The full text of Mehta's remedies opinion was not fetched this session.

---

## 3. E-E-A-T, Quality Rater Guidelines, links, brands and entities

### Takeaway
E-E-A-T is a rater framework, not a direct ranking signal. Raters' scores train and evaluate systems, but they do not change any individual site's ranking. Trust is the central component. The QRG was updated in January 2025 and September 2025, and instructs "Lowest" for low-effort scaled or AI main content. Google says links still matter but are less dominant than in the past. Entity and brand understanding (Knowledge Graph) underpins both classic and AI results.

### Cited Findings
- **[CONFIRMED]** In Dec 2022 Google added "Experience" (E-E-A-T) and said Trust is the most important member of the family. *(from prior knowledge)* — [Google Search Central blog, Dec 2022](https://developers.google.com/search/blog/2022/12/google-raters-guidelines-e-e-a-t)
- **[CONFIRMED]** Rater ratings do not directly affect rankings. — [Search Engine Land](https://searchengineland.com/google-quality-raters-content-ai-generated-454161)
- **[CONFIRMED]** January 2025 QRG update:
  - first formal definition of generative AI;
  - raters assess whether main content is auto- or AI-generated;
  - main content mostly generated with little effort, originality or added value gets **Lowest**.
  John Mueller reiterated this at Search Central Live Madrid (April 2025). — [Search Engine Land](https://searchengineland.com/google-quality-raters-content-ai-generated-454161); [PPC Land](https://ppc.land/google-updates-quality-rater-guidelines-with-ai-content-evaluation-criteria/)
- **[CONFIRMED]** September 2025 QRG update: expanded generative AI definition, AI Overviews examples, stricter YMYL expectations. No 2026 QRG revision was found. — [Semrush](https://www.semrush.com/blog/google-expands-rules-on-low-value-content); current PDF: [services.google.com/fh/files/misc/hsw-sqrg.pdf](https://services.google.com/fh/files/misc/hsw-sqrg.pdf)
- **[CONFIRMED]** Google's AI-content stance (Feb 2023, unchanged): it rewards quality "however it is produced". Using automation primarily to manipulate rankings is spam. *(from prior knowledge)* — [Google Search Central blog, Feb 2023](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content)
- **[CONFIRMED]** Links: "Link analysis systems and PageRank" remain a named active system. — [Ranking systems guide](https://developers.google.com/search/docs/appearance/ranking-systems-guide). Gary Illyes said in April 2024 that links are not among the top few ranking factors and that Google "needs very few links to rank pages." *(from prior knowledge; Search Engine Roundtable coverage)*
- **[CONFIRMED, DOJ exhibits]** Anchors (link anchor text) remain one of the three "ABC" topicality inputs. — [Search Engine Land](https://searchengineland.com/google-abc-ranking-signals-455360)
- **[LEAK]** Author entities and site topical embeddings exist as attributes. — [Wikipedia](https://en.wikipedia.org/wiki/2024_Google_Search_documentation_leak)

### Inferences
- Brand and entity signals matter for SMBs: consistent NAP, Knowledge Panel and Business Profile, mentions on trusted third-party sites, and branded search that drives clicks. They work through several channels: link analysis, NavBoost, the Knowledge Graph, and AI grounding. This is inferred from combined evidence; Google has not published "brand" as a named factor.

### Gaps
- No primary Google statement in 2025–2026 quantifies the weight of links. The Illyes quote was not re-fetched.

---

## 4. Core and spam updates 2024–2026

### Takeaway
Since March 2024 Google has run 2–4 core updates per year plus spam updates. They:
- integrated helpful content into core;
- added three spam policies: scaled content abuse, expired domain abuse, site reputation abuse;
- hurt many small independent publishers (2023–24);
- boosted forums and UGC, especially Reddit.
The 2026 core updates (March, May) came with no stated goals.

### Cited Findings
- **[CONFIRMED]** March 2024 core update (5 Mar – 19 Apr 2024):
  - folded helpful content into core;
  - launched the scaled content abuse, expired domain abuse and site reputation abuse policies;
  - Google said it reduced low-quality, unoriginal content in results by ~45% (initial target 40%).
  *(from prior knowledge)* — [Google blog, Mar 2024](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)
- **[CONFIRMED]** 2024–2025 updates, all *(from prior knowledge, verify on [Search Status Dashboard](https://status.search.google.com/))*:
  - Aug 2024 core update, which Google said aimed to surface more useful content from small and independent sites;
  - Nov 2024 and Dec 2024 core updates;
  - Dec 2024 spam update;
  - Mar 2025 and Jun 2025 core updates;
  - Aug 2025 spam update;
  - a Dec 2025 core update is believed to have occurred.
- **[CONFIRMED]** March 2026 core update ran 27 Mar – 8 Apr 2026. — [Search Engine Land](https://searchengineland.com/google-march-2026-core-update-rollout-is-now-complete-473883); [SEJ](https://www.searchenginejournal.com/google-confirms-march-2026-core-update-is-complete/)
- **[CONFIRMED]** May 2026 core update ran 21 May – 2 Jun 2026 (~12 days), with no companion blog post or stated goals. Google says core updates are not penalties and recommends waiting a week after completion before analysing. — [SEJ](https://www.searchenginejournal.com/google-begins-rolling-out-may-2026-core-update/575589/); [Priority Pixels](https://prioritypixels.co.uk/insights/google-may-2026-core-update-rollout-complete/)
- **[STUDY, secondary]** June 2026 spam update targeted scaled content abuse and site reputation abuse. It was algorithmic, with no Search Console notice. A single anecdotal site with ~130 AI articles reportedly fell from ~278 to ~20 visits/day. — [Priority Pixels](https://prioritypixels.co.uk/insights/googles-june-2026-spam-update-is-rolling-out/); [onlinemarketing.de](https://onlinemarketing.de/seo/googles-june-2026-spam-update-schon-beendet-darauf-sollten-seos-trotzdem-achten). An August 2026 spam update is referenced in one German source ([onlinemarketing.de](https://onlinemarketing.de/seo/google-august-2026-spam-update-wissen)) but was not verified.
- **[CONFIRMED]** Scaled content abuse policy targets content generated at scale "primarily to manipulate ranking," regardless of method (AI, human or combination). — [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies) *(policy page not re-fetched)*
- **[STUDY / OPINION]** Reddit and forum gains followed:
  - a Google–Reddit data licensing deal, reported at ~$60M/yr (Feb 2024);
  - the "Discussions and forums" SERP feature;
  - the 2023–24 updates.
  Small publishers (e.g. HouseFresh) documented severe losses after the Sept 2023 HCU and March 2024 updates. *(from prior knowledge)*
- **[STUDY]** Pew: Wikipedia, YouTube and Reddit are the three most-cited sources in both AI summaries (15% combined) and standard results (17%). — [Pew Research, Jul 2025](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)

### Inferences
- Mass-produced AI pages (city-swap pages, programmatic blogs) are the highest-risk tactic for BrandPulse clients in 2026. Each page needs unique, first-hand value.

### Gaps
- No verified quantitative winners/losers data for the 2026 core updates. Google's own announcement of the June 2026 spam update was not fetched.

---

## 5. Local SEO ranking factors (critical for Indian SMBs)

### Takeaway
Google officially names three local factors:
- **relevance**: how well the Business Profile matches the search;
- **distance**;
- **prominence**: how well known the business is, including reviews and ratings.
Better local ranking cannot be paid for. Complete, verified Business Profiles with many positive reviews and replies are the confirmed levers.

### Cited Findings
- **[CONFIRMED]**
  - Relevance = "how well a Business Profile matches what someone is searching for".
  - Distance is taken from the searcher's location or an inferred location.
  - Prominence = "how well-known a business is"; "More reviews and positive ratings can help your business's local ranking."
  - "There's no way to request or pay for a better local ranking."
  - Official tips: verify the business, keep hours, address, category and attributes accurate, respond to reviews, add photos and videos.
  — [Google Business Profile Help](https://support.google.com/business/answer/7091)
- **[CONFIRMED]** The same help page says prominence also reflects information Google has from across the web (links, articles, directories) and that organic web ranking contributes. *(from prior knowledge of the page's longer text; the fetch summary did not quote it)*
- **[STUDY]** Whitespark's Local Search Ranking Factors survey (expert opinion, latest ~2025 edition, *from prior knowledge*) ranks these GBP signals top for the local pack:
  - primary category;
  - keywords in business name, which is a known spam vector and against GBP guidelines when fake;
  - proximity;
  - review count and recency.
  It ranks on-page and links top for local organic.

### Inferences
- For Indian SMBs, which often have incomplete GBPs, few reviews and inconsistent listings on directories like Justdial, Sulekha and Practo, GBP completeness and review velocity are the cheapest wins. Directory citations double as AI grounding sources.

### Gaps
- No Google-published weights. The Whitespark survey was not fetched this session.

---

## 6. How AI Overviews and AI Mode select sources; prevalence and CTR

### Takeaway
Google says AI Overviews and AI Mode use "query fan-out" across subtopics. A page needs only to be indexed and snippet-eligible, and Google says there is "no special optimization" or schema required. Third-party data (2025–26) shows:
- AIO overlap with the organic top 10 fell from ~76% to ~38% after the Gemini 3 upgrade in January 2026;
- clicks fall sharply when an AIO appears (Pew: 8% vs 15%);
- Seer saw organic CTR on AIO queries partially recover in early 2026.

### Cited Findings
- **[CONFIRMED]** How Google says AI features work:
  - AIO and AI Mode "may use a 'query fan-out' technique — issuing multiple related searches across subtopics and data sources" and show "a wider and more diverse set of helpful links."
  - They may use different models, so their links differ.
  - AIOs show only when additive.
  - Eligibility = indexed and snippet-eligible; "There are no additional requirements … nor other special optimizations necessary"; "no special schema.org structured data."
  - Controls: robots.txt, `nosnippet`, `data-nosnippet`, `max-snippet`, `noindex`. Google-Extended covers training and grounding in other Google systems.
  - Traffic is reported in Search Console Performance under "Web".
  - Google claims clicks from AIO pages are "higher quality."
  Page last updated 10 Dec 2025. — [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- **[CONFIRMED]** Usage figures:
  - AI Overviews reached 2B monthly users (Q2 2025 earnings, Pichai).
  - AI Mode had 100M+ MAU in the US and India (July 2025).
  - AI Overviews were upgraded to Gemini 3 globally in Jan 2026; Gemini 3 came to AI Mode on its launch day (Nov 2025).
  — [TechCrunch, Jul 2025](https://techcrunch.com/2025/07/23/googles-ai-overviews-have-2b-monthly-users-ai-mode-100m-in-the-us-and-india); [SEJ, Mar 2026](https://www.searchenginejournal.com/google-ai-overview-citations-from-top-ranking-pages-drop-sharply/568637/)
- **[CONFIRMED]** Launch dates *(from prior knowledge)*:
  - AIO launched in the US 14 May 2024 and expanded to India Aug 2024;
  - AI Mode launched in the US at I/O, 20 May 2025, and in India as a Labs experiment in June 2025.
- **[STUDY] Pew Research** (900 US adults, 68,879 searches, browsing from March 2025, published 22 Jul 2025):
  - prevalence: AI summary on ~18% of searches; 60% of question searches; 53% of 10+ word searches vs 8% of 1–2 word searches;
  - result-link clicks: 8% of visits with a summary vs 15% without;
  - clicks inside the summary: 1%;
  - session ended: 26% with a summary vs 16% without;
  - sources: .gov is 6% of summary sources vs 2% in standard results.
  — [Pew](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)
- **[STUDY] Seer Interactive**:
  - Nov 2025: organic CTR on informational AIO queries fell 61% since mid-2024, and paid CTR fell 68%.
  - v3, April 2026 (53 brands, 5.47M queries, 2.43B impressions): organic CTR on AIO queries rose from a 1.3% floor (Dec 2025) to 2.4% (Feb 2026). Non-AIO organic CTR rose from 2.8% to 3.8%.
  — [Seer 2026 update](https://www.seerinteractive.com/blog/aio-impact-on-google-ctr-2026-update); [PPC Land](https://ppc.land/google-ai-overviews-reduce-organic-ctr-61-paid-traffic-68/)
- **[STUDY] Ahrefs** (Jul 2025; 1.9M citations from 1M AIOs, top 3 citations each):
  - 76.1% of cited pages ranked in the top 10, 9.5% in positions 11–100, 14.4% beyond 100;
  - median rank of the primary citation = 2;
  - the fan-out theory "doesn't neatly fit" their data.
  — [Ahrefs](https://ahrefs.com/blog/search-rankings-ai-citations)
- **[STUDY] Ahrefs update** (published ~2 Mar 2026; 863K keywords, 4M AIO URLs):
  - only 38% of cited pages were in the top 10, 31.2% in positions 11–100, 31.0% beyond 100;
  - YouTube is 5.6% of all AIO citations and the most-cited domain (up 34% in 6 months);
  - Ahrefs says improved parsing makes the two datasets not directly comparable;
  - the timing follows the Jan 2026 Gemini 3 upgrade, but causation is not established.
  — [SEJ](https://www.searchenginejournal.com/google-ai-overview-citations-from-top-ranking-pages-drop-sharply/568637/)
- **[STUDY]** Other overlap figures (secondary sources; differing methods):
  - BrightEdge: only ~17% overlap with the organic top 10;
  - Moz, Feb 2026, ~40K queries: 88% of AI Mode citations were not in that query's organic results;
  - arXiv 2604.27790: Jaccard similarity 0.17 between AIO citations and the top 10.
  — [Ahrefs/SEJ coverage](https://www.searchenginejournal.com/google-ai-overview-citations-from-top-ranking-pages-drop-sharply/568637/); [Thrivestack](https://www.thrivestack.ai/research/ai-citation-sources-2026)
- **[STUDY, conflicting]** The Ahrefs figure "top result CTR -58% with AIO" exists only in secondary sources. — [Neil Patel](https://neilpatel.com/marketing-stats/ai-overview-expansion-organic-ctr-decline/)

### Inferences
- Since early 2026, ranking #1 for the head query is neither necessary nor sufficient for an AIO or AI Mode citation. Pages that rank for many fan-out sub-queries, plus YouTube, UGC and trusted directories, get cited. For BrandPulse, the AI audit (Gemini grounded on Google Search) is a reasonable proxy for this, since it uses the same grounding substrate. That proxy status is an inference: Google has not said the Gemini API grounding equals AIO selection.
- "No special optimization" is literally true technically: no new markup is needed. Practically, coverage of sub-topics and third-party presence drive inclusion.

### Gaps
- No Google-published AIO prevalence percentage. No India-specific CTR data found. No verified 2026 AI Mode user count.

---

## 7. Technical foundations that still matter

### Takeaway
The fundamentals are confirmed and stable:
- crawlable, indexable, mobile-equivalent HTML;
- clean canonicalization and sitemaps;
- JS that renders, with server-side rendering safer;
- Core Web Vitals (LCP, INP, CLS), which act only as a light page-experience tiebreaker;
- structured data that matches visible text.
Rich results have been pruned: FAQ and HowTo were curtailed in 2023, and 7 types were retired in 2025.

### Cited Findings
- **[CONFIRMED]** Google retired 7 structured data features on 12 June 2025: Book Actions, Course Info, Claim Review, Estimated Salary, Learning Video, Special Announcement, Vehicle Listing. The reason is low usage. Ranking is unaffected. — [Google Search Central blog](https://developers.google.com/search/blog/2025/06/simplifying-search-results)
- **[CONFIRMED]** Aug 2023: FAQ rich results limited to well-known authoritative government and health sites. HowTo rich results were removed (mobile in Aug 2023, desktop later). *(from prior knowledge)* — [Google blog, Aug 2023](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
- **[CONFIRMED]** INP replaced FID as a Core Web Vital on 12 Mar 2024. Thresholds for "good": LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. Google says good page experience is rewarded, but relevance dominates. *(from prior knowledge)* — [Page experience docs](https://developers.google.com/search/docs/appearance/page-experience); [INP announcement](https://developers.google.com/search/blog/2023/05/introducing-inp)
- **[CONFIRMED]** Mobile-first indexing was completed for all sites as of 5 July 2024. Sites inaccessible on mobile are no longer indexed. *(from prior knowledge)* — [Google blog, Jun 2024](https://developers.google.com/search/blog/2024/06/mobile-indexing-vlast-final-final)
- **[CONFIRMED]** Google crawls, then renders JS in a queue with evergreen Chromium. Blocked resources, client-only links and noindex-in-JS patterns are risks. *(from prior knowledge)* — [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- **[STUDY]** Vercel/MERJ (2024): Googlebot rendered 100% of the HTML pages sampled, including JS-heavy pages. The median render delay was ~10s. *(from prior knowledge)* — [Vercel](https://vercel.com/blog/how-google-handles-javascript-throughout-the-indexing-process). Note: many AI crawlers (non-Google) do not execute JS, which is a reason for SSR.
- **[CONFIRMED]** AI features eligibility also requires that robots.txt and the CDN allow Googlebot, plus internal linking and structured data consistent with visible text. — [Google AI features page](https://developers.google.com/search/docs/appearance/ai-features)

### Inferences
- For BrandPulse's Next.js client sites, the following set covers the technical baseline for both classic and AI search:
  - SSR or SSG;
  - an accurate sitemap;
  - self-referencing canonicals;
  - LocalBusiness or Organization schema that matches visible NAP;
  - Review and Product schema where genuine;
  - fast LCP and INP.
- FAQ schema still helps machines parse content, but it will not earn FAQ rich results for most SMBs.

### Gaps
- Exact current list of supported rich result types was not re-fetched; check the [Search Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery). No 2026 Google statement on CWV weight was found.
