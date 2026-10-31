# GEO/AEO Evidence: What Actually Moves AI Visibility vs. Hype (researched 2026-10-23)

Evidence grades used throughout:
- **A**: peer-reviewed or controlled experiment
- **B**: large correlational dataset (10k+ units), usually from a vendor
- **C**: vendor case study or small test
- **D**: anecdote, opinion or official statement with no data

Most "large studies" come from tool vendors (Ahrefs, Semrush, Profound, Seer, Peec) who sell AI-visibility tracking. Each has a commercial interest in the idea that AI visibility is measurable and optimizable.

## Q1. Academic and peer-reviewed work: GEO paper, follow-ups, manipulation, robustness

### Takeaway
The original GEO paper (Aggarwal et al., KDD 2024) found that adding quotations, statistics and citations raised a source's visibility in generative answers by roughly 30–40%, and keyword stuffing hurt. The gains were largest for low-ranked sources. A NeurIPS 2025 follow-up (C-SEO Bench) found most of these content-rewriting methods are largely ineffective or even harmful once they are tested across tasks and against competitors who also use them. Traditional retrieval rank dominated.

### Cited Findings
- **GEO paper, design (A, but lab setting).** GEO-bench has 10K queries (8K train, 1K validation, 1K test) drawn from 9 sources (MS MARCO, ORCAS-I, Natural Questions, ELI5, Perplexity Discover, others). It covers 25 domains and is about 80% informational, 10% transactional and 10% navigational. The engine is mostly a simulated generative engine plus Perplexity.ai. — [Aggarwal et al., arXiv 2311.09735 (HTML v3)](https://arxiv.org/html/2311.09735v3)
- **GEO paper, results by method.** Relative improvement on Position-Adjusted Word Count, approximated from Table 1:

  | Method | Change |
  |---|---|
  | Quotation Addition | about +43% (best) |
  | Statistics Addition | about +33% |
  | Fluency Optimization | about +29% |
  | Cite Sources | about +28% |
  | Technical Terms | about +18% |
  | Easy-to-Understand | about +14% |
  | Authoritative tone | about +12% |
  | Unique Words | about +6% |
  | Keyword Stuffing | about −9% (worse than baseline) |

  The headline figures are "up to 40%" (41% on PAWC, 28% on Subjective Impression). — [arXiv 2311.09735v3](https://arxiv.org/html/2311.09735v3); [abstract](https://arxiv.org/abs/2311.09735)
- **GEO paper on Perplexity.ai (the one production engine tested).** Up to +22% on PAWC and +37% on Subjective Impression. Quotation Addition was the top method on PAWC. Statistics Addition reached about 37% on Subjective Impression. — [arXiv 2311.09735v3](https://arxiv.org/html/2311.09735v3)
- **GEO paper, rank effect.** Sources ranked 5th gained the most: Cite Sources +115.1%, Quotation +99.7%, Statistics +97.9%. The top-ranked source **lost** visibility under the same methods (Cite Sources −30.3%). This means much of the gain is redistribution, which makes it a zero-sum game. — [arXiv 2311.09735v3](https://arxiv.org/html/2311.09735v3)
- **GEO paper, domain dependence.** Different methods worked in different domains:
  - Statistics: Law & Government, debate and opinion
  - Quotations: People & Society, history and explanation
  - Cite Sources: factual queries and Law & Government
  - Authoritative tone: debate and history

  — [arXiv 2311.09735v3](https://arxiv.org/html/2311.09735v3)
- **GEO paper, stated limitations.** Only two engines were tested and just one was public. Engines and query distributions evolve. The paper did not measure effects on search ranking, and query tagging may be noisy. — [arXiv 2311.09735v3](https://arxiv.org/html/2311.09735v3)
- **C-SEO Bench (Puerto et al., NeurIPS 2025; arXiv June 2025, revised Oct 2025) (A).** It tests conversational-SEO methods across two tasks (question answering and product recommendation), with three domains each and varying adoption rates among competing actors. Most C-SEO methods were "largely ineffective" and frequently had a negative impact on ranking. Traditional SEO, meaning improving a source's ranking in the LLM's retrieved context, was "significantly more effective". Gains shrink as more actors adopt the methods, so the game is congested and zero-sum. The initial retrieval rank plays "a far more dominant role". — [arXiv 2506.11097](https://arxiv.org/abs/2506.11097); [NeurIPS 2025 poster](https://neurips.cc/virtual/2025/poster/121465)
- **Strategic Text Sequences (Kumar & Lakkaraju, Harvard, arXiv April 2024) (A, adversarial lab study).** The authors inserted a GCG-optimized adversarial token sequence into a product's catalog text. This significantly raised the odds that a fictitious coffee machine was the top recommendation in Llama-2. Sequences like this have been reported to transfer to black-box models. The authors frame it as an unfair-advantage risk. This is an attack, not a legitimate marketing tactic, and it now falls under Google's spam policy (see Q4). — [arXiv 2404.07981](https://arxiv.org/abs/2404.07981); [code](https://github.com/aounon/llm-rank-optimizer/blob/main/README.md)
- **Source selection bias (Ma, Qin, Xu, Tan, arXiv Sept 2025) (B/A).** About 10K websites from Google's generative and conventional results were analyzed. Generative engines prefer content the LLM finds more predictable (lower perplexity) and sources semantically similar to each other. RAG API experiments attribute this to the model's own generative tendencies. — [arXiv 2509.14436](https://arxiv.org/html/2509.14436v1)
- **Brand bias (Kamruzzaman et al., EMNLP 2024 main) (A).** LLMs disproportionately associate global brands with positive attributes. Country-of-origin effects can sometimes favor local brands. This is relevant for local SMB clients competing against national chains (for example, Clove Dental vs. an independent clinic). — [arXiv 2406.13997](https://arxiv.org/abs/2406.13997)
- **Run-to-run inconsistency (SparkToro + Gumshoe, early 2026) (C, not peer-reviewed; Gumshoe sells AI tracking).** 600 volunteers ran 12 prompts on ChatGPT, Claude and Google AI Overviews/AI Mode a total of 2,961 times. There was a "<1 in 100" chance that two responses gave the same brand list. Brand presence percentages were more stable than exact rankings. — [WARC summary](https://www.warc.com/content/feed/llms-produce-random-results-when-listing-brand-recommendations/en-GB/11352); [Communicate Online](https://communicateonline.me/news/ai-brand-recommendations-vary-marketers-warned-on-tracking-tools/)
- Another 2025 preprint compares source coverage and citation bias in LLM search vs. traditional search (Zhang et al., arXiv 2512.09483). Only the abstract was seen. — [arXiv 2512.09483](https://arxiv.org/abs/2512.09483v1)

### Inferences
- The robust academic signal is that **retrieval rank comes first** and on-page rewriting comes second. Adding quotes, statistics and sources to a page that already gets retrieved is low-cost and plausibly helpful, but the 40% figure is a lab result in a non-competitive setting. It should not be sold to clients as an expected uplift.
- C-SEO Bench's zero-sum finding means "GEO content formatting" loses its edge as competitors adopt it. Durable advantage has to come from off-site signals and retrieval rank.
- The SparkToro result supports BrandPulse's audit design: measure **presence rate over many prompts and runs**, not single-answer rank. Reports should avoid claiming precise rank positions.

### Gaps
- I did not find an independent replication of the GEO-paper method gains on ChatGPT, Gemini or Google AI Overviews in production with real competing pages.
- I did not verify the full results of the June 2026 skincare brand-recommendation preprint (arXiv 2606.17443) or the July 2026 Chinese generative-search study.

## Q2. Large data studies: what correlates with AI visibility and where citations come from

### Takeaway
Off-site brand mentions are the strongest correlate of AI Overview brand visibility. Backlinks correlate much more weakly. AI citations draw heavily from UGC and reference platforms (Reddit, Wikipedia, YouTube, LinkedIn), but the platform shares are volatile and measured inconsistently. Overlap between AI Overview citations and Google's top 10 fell from about 76% (2025) to about 38% (2026), because AI features increasingly cite pages beyond the top 10.

### Cited Findings
- **Ahrefs brand-visibility correlation (May 26, 2025; 75K brands, DR>40; Spearman) (B; Ahrefs sells Brand Radar).** Correlations with AI Overview brand mentions:

  | Signal | Correlation |
  |---|---|
  | Branded web mentions | 0.664 |
  | Branded anchors | 0.527 |
  | Branded search volume | 0.392 |
  | Domain Rating | 0.326 |
  | Referring domains | 0.295 |
  | Branded organic traffic | 0.274 |
  | Backlinks | 0.218 |
  | URL Rating | 0.180 |
  | Number of site pages | 0.170 |

  About 26% of brands had zero AI Overview mentions. Brands in the top quartile of web mentions averaged 169 AI Overview mentions, against 14 for the second quartile and 0–3 for the bottom half ("winner-takes-all"). Ahrefs itself says this is correlation, not causation, and that most correlations are moderate to weak. — [Ahrefs](https://ahrefs.com/blog/ai-overview-brand-correlation/)
- **Ahrefs AI Overview vs. top-10 overlap (B).**
  - Update dated March 2, 2026 (863K keyword SERPs, 4M AI Overview URLs): about 38% of AI Overview-cited URLs rank in the top 10 for the same query. Organic-only: 37.1% in the top 10, 26.2% in positions 11–100, and 36.7% not in the top 100.
  - The earlier July 2025 version put the overlap at 76%.
  - YouTube was 5.6% of all AI Overview citations and 18.2% of citations that didn't rank in the top 100.

  — [Ahrefs update](https://ahrefs.com/blog/ai-overview-citations-top-10/?tw_p=twt); [SEJ coverage](https://www.searchenginejournal.com/google-ai-overview/518427/); [DesignRush](https://news.designrush.com/ai-overview-citations-drop-ahrefs). Another tool reported about 17% top-10 overlap using a different method. — [SEJ](https://www.searchenginejournal.com/google-ai-overview/515286/)
- **Google confirms query fan-out.** AI Overviews and AI Mode may issue "multiple related searches across subtopics and data sources". This explains why cited pages often aren't in the top 10 for the head query. — [Google Search Central, AI features (updated 2025-12-10)](https://developers.google.com/search/docs/appearance/ai-features)
- **Profound citation patterns (Aug 2024–Jun 2025; 680M citations) (B; Profound is a vendor).** Most-cited source by share of all citations:
  - ChatGPT: Wikipedia, 7.8%
  - Perplexity: Reddit, 6.6%
  - Google AI Overviews: Reddit, 2.2%

  Secondary write-ups quote about 47.9% (Wikipedia, ChatGPT) and 46.7% (Reddit, Perplexity) as "share of the top-10 sources". This is a different denominator and is often misquoted as overall share. — [Profound](https://www.tryprofound.com/blog/ai-platform-citation-patterns)
- **Semrush most-cited domains (B; vendor).**
  - Nov 2025 (230K+ prompts, Jul–Oct 2025, ChatGPT Search, AI Mode and Perplexity): Reddit and LinkedIn were in the top 5 on all three. ChatGPT citations to Reddit and Wikipedia dropped sharply in mid-September 2025. AI Mode strongly favors Google-owned domains. — [Semrush](https://www.semrush.com/blog/most-cited-domains-ai/)
  - March 2026 (325K prompts, Jan–Feb 2026): LinkedIn ranked #2 overall at about 11% of responses (ChatGPT about 14.3%, AI Mode 13.5%, Perplexity 5.3%). This study was a collaboration with LinkedIn, which is a conflict of interest. — [PPC Land](https://ppc.land/linkedin-ranks-2-in-ai-citations-what-89k-urls-reveal-about-b2b-visibility/); [Semrush](https://www.semrush.com/blog/linkedin-ai-visibility-study/)
- **Volatility (C).** 5W Research reports that ChatGPT's Reddit citation share fell from about 60% to about 10% in mid-September 2025. This is a secondary source with an unclear denominator. — [5W Research](https://www.5wpr.com/research/state-of-ai-citations-2026/)
- **Freshness, Seer Interactive (B; agency).**
  - 2026 study (7,683 pages, 47,097 citations, ChatGPT, Gemini and Perplexity, Mar–Jun 2026): about 3 in 4 cited pages had been updated within the past year. Judged by last-update date, 72% looked fresh; judged by original publish date, 42% did. Seer concludes that freshness comes from **maintenance more than new publishing**.
  - Only about two-thirds of the pages could be dated.
  - Secondary reports give per-engine shares updated within a year: Gemini 78%, ChatGPT 73%, Perplexity 65%. These were not verified on Seer's page.

  — [Seer 2026](https://www.seerinteractive.com/insights/study-content-recencys-impact-on-ai-visibility-in-2026); [Seer earlier study](https://seerinteractive.com/insights/study-ai-brand-visibility-and-content-recency)
- **"Best X" listicles.**
  - Ahrefs (Dec 2025, 26,283 ChatGPT source URLs): recently updated "best X" lists were the most prominent page type cited in ChatGPT, including lists where the publisher ranked itself #1. Ahrefs declined to recommend the tactic. — [Ahrefs](https://ahrefs.com/blog/best-lists-research/)
  - Peec (Mar 2026; 232K citations from 13K software listicles, Dec 2025–Feb 2026): about 11% of citations came from self-promotional listicles, stable over 12 weeks. ChatGPT's share was about 3.6%, against about 10% for AI Mode and Perplexity. Peec advises against the tactic. — [Peec](https://docs.peec.ai/research/self-promotional-listicles)
  - Hoth (Sept 2026): on ChatGPT, 69.6% of citing responses pointed to the brand's own domain for branded questions, but only 1.3% for "best" questions. — [The Hoth](https://thehoth.com/blog/ai-cites-listicles/)
  - Texta's analysis of the same 232K dataset contradicts itself between "65% fewer" and "2.3x more" citations, so I disregarded it. — [Texta](https://www.texta.ai/api/md/blog/self-promotional-listicles-analysis-232k-citations)

### Inferences
- For "best X in city" queries, AI engines lean on **third-party** lists and directories, not on the brand's own site. Getting onto third-party "best of" lists, directories and review sites is likely the highest-leverage local tactic. This matches the Ahrefs mention correlations and the Hoth 1.3% finding.
- Platform-share numbers move by tens of points within weeks (the Sept 2025 Reddit and Wikipedia drop). Any playbook built on "post on Reddit because ChatGPT cites it 40%" is fragile.
- Freshness is cheap and well supported correlationally. Updating key pages regularly with visible dates is a reasonable recommendation.

### Gaps
- I did not retrieve BrightEdge or Authoritas primary studies, or Kevin Indig's Growth Memo analyses, within the tool budget.
- I did not confirm the exact Reddit percentage in the March 2026 Semrush/eMarketer chart.
- No dataset found was specific to local service businesses or India. Citation-source mixes for local queries (Justdial, Practo, Google Business Profile) are unmeasured in these studies.

## Q3. Specific tactics: schema, llms.txt, answer formatting, stats/quotes, E-E-A-T, reviews, Reddit, PR, Wikipedia, comparison pages, listicles

### Takeaway
The best-tested tactic is schema, and a controlled study found it did not move AI citations for already-cited pages. llms.txt is unsupported by any major AI search engine according to Google. Statistics and quotations have lab support only. Off-site mentions, third-party lists and freshness have the strongest correlational support. Review platforms, Reddit participation, Wikipedia and answer-first formatting are widely recommended, but I found no controlled evidence for them.

### Cited Findings
- **Schema / structured data: no lift (A-, quasi-experimental).** Ahrefs (May 11, 2026) followed 1,885 pages that added JSON-LD between Aug 2025 and Mar 2026, against about 4,000 matched controls, using difference-in-differences with 30-day windows. Effects relative to controls:
  - ChatGPT: +2.2%, indistinguishable from zero
  - AI Mode: +2.4%, indistinguishable from zero
  - AI Overviews: −4.6%, statistically significant but unexplained

  Caveats: only already-cited pages (100+ AI Overview citations) were studied, all schema types were pooled, only JSON-LD was tested, and the post-treatment window was 30 days. Ahrefs suggests its earlier "53% of cited pages have schema" finding is likely confounded by sites with stronger SEO overall. Perplexity was not tested. — [Ahrefs](https://ahrefs.com/blog/schema-ai-citations/); [SEJ](https://www.searchenginejournal.com/schema-markup-didnt-move-ai-citations-in-ahrefs-test/582823/)
- **Schema and live fetches (C).** A searchVIU experiment, cited by Ahrefs and a vendor blog, reports that five AI systems ignored JSON-LD during real-time page retrieval. I did not verify the methodology. — [Ahrefs](https://ahrefs.com/blog/schema-ai-citations/); [madx.digital](https://www.madx.digital/learn/schema-structured-data-for-ai-search)
- **Google's official position (D, but authoritative).** Google's AI features page (updated 2025-12-10) says:
  - "There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary."
  - "There's also no special schema.org structured data that you need to add."
  - "You don't need to create new machine readable files, AI text files, or markup."

  The page advises allowing crawling, keeping important content in text form, matching structured data to visible text, and keeping Merchant Center and **Business Profile** information up to date. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- **llms.txt (D).**
  - John Mueller (June 2025): "no AI system currently uses llms.txt". He compared it to the keywords meta tag. — [SERoundtable](https://seroundtable.com/google-ai-llms-txt-39607.html); [Search Engine Land](https://searchengineland.com/google-says-normal-seo-works-for-ranking-in-ai-overviews-and-llms-txt-wont-be-used-459422)
  - Mueller later said it is "purely speculative". Gary Illyes reportedly said Google has no plans to support it. — [TechWyse](https://www.techwyse.com/?p=76517)
  - An llms.txt file briefly appeared on Google developer docs in Dec 2025 and was then removed. The reports are inconsistent. — [Omnius](https://www.omnius.so/industry-updates/google-adds-llms-txt-to-docs-after-publicly-dismissing-it)
  - Its practical use is mainly for AI coding assistants reading documentation. — [geotoolbox](https://geotoolbox.ai/blog/llms-txt.md)
- **Statistics, quotations and citing sources (A, lab only).** The effect sizes are in Q1 (GEO paper). C-SEO Bench found content-rewriting methods largely ineffective in competitive settings. — [arXiv 2311.09735](https://arxiv.org/html/2311.09735v3); [arXiv 2506.11097](https://arxiv.org/abs/2506.11097)
- **Keyword stuffing (A, negative).** About −9% on PAWC in the GEO paper. — [arXiv 2311.09735](https://arxiv.org/html/2311.09735v3)
- **Predictable, fluent text (A/B).** Fluency optimization gave about +29% in the GEO paper. Generative engines prefer content with low LLM perplexity (Ma et al.). — [arXiv 2311.09735](https://arxiv.org/html/2311.09735v3); [arXiv 2509.14436](https://arxiv.org/html/2509.14436v1)
- **Off-site brand mentions and digital PR (B).** Strongest correlate in Ahrefs' data (0.664) vs. backlinks (0.218). — [Ahrefs](https://ahrefs.com/blog/ai-overview-brand-correlation/)
- **Third-party "best of" lists (B).** Most prominent ChatGPT source type (Ahrefs). Brand-owned domains are cited for only 1.3% of "best" queries (Hoth). — [Ahrefs](https://ahrefs.com/blog/best-lists-research/); [The Hoth](https://thehoth.com/blog/ai-cites-listicles/)
- **Self-promotional "best X" listicles on your own site (B, mixed).** They do get cited (about 11% of software-listicle citations, but only about 3.6% on ChatGPT) and have not yet been penalized algorithmically. Reputational and spam-policy risk remains. — [Peec](https://docs.peec.ai/research/self-promotional-listicles)
- **Reddit, LinkedIn, YouTube and Wikipedia as citation sources (B).** These are heavily cited platforms (Profound, Semrush, Ahrefs YouTube 5.6%). I found no study showing that a brand's *own participation* on these platforms causes higher brand visibility. — [Profound](https://www.tryprofound.com/blog/ai-platform-citation-patterns); [Semrush](https://www.semrush.com/blog/most-cited-domains-ai/)

### Inferences
Ranked tactic inventory (my synthesis; strongest evidence first):

1. **Rank and be retrievable in the underlying search index (Google, and Bing for ChatGPT).**
   - Evidence: A for retrieval rank dominating (C-SEO Bench); B for top-10 overlap of 38–76%.
   - Fundamentals: crawlable, indexed, text content, robots and CDN not blocking AI crawlers.
2. **Earn off-site brand mentions and third-party list placements** (directories, "best of" articles, press).
   - Evidence: B (Ahrefs ρ=0.664 for mentions; Hoth's 1.3% own-domain figure on "best" queries).
   - Correlation only: big brands have more mentions and more AI visibility, so causation is unproven.
3. **Keep key pages fresh (maintenance updates).**
   - Evidence: B (Seer, about 75% of cited pages updated within a year).
4. **Add statistics, quotations and cited sources; write fluent, plain prose.**
   - Evidence: A in the lab, but effects shrink or reverse under competition.
   - Cheap, low risk, worth doing, but don't promise a figure.
5. **Keep Google Business Profile and Merchant data accurate.**
   - Evidence: D (named in Google's official guidance). Likely high relevance for local clients.
6. **Schema.**
   - Evidence: A- null for AI citations on already-cited pages.
   - Keep it for rich results and entity clarity, but do not sell it as a GEO lever.
7. **Self-promotional "best" listicles.**
   - Evidence: B that they get cited.
   - Medium risk under the scaled-content and AI-manipulation spam policies, plus reputational risk.
8. **llms.txt.**
   - Evidence: D, and no major engine uses it.
   - Hype for visibility purposes. Harmless, but don't bill for it as GEO.
9. **Keyword stuffing, adversarial text sequences, hidden prompt injections.**
   - Evidence: A negative (keyword stuffing); the others are explicitly spam.

### Gaps
- **Answer-first / 40–60-word answer blocks:** I found no controlled test. This is practitioner opinion (D).
- **Author bylines and E-E-A-T signals:** no controlled AI-citation study found.
- **Review platforms (G2, Clutch, Google reviews):** no causal study found linking review volume or rating to AI mention rate, although Google's guidance names Business Profile data.
- **Wikipedia and Wikidata creation:** no study of brand-visibility lift found. Wikipedia's high citation share is documented, but notability rules make this tactic inaccessible to most SMBs.
- **FAQ markup specifically:** it was pooled in the Ahrefs schema test, and no separate result was reported.
- **Comparison pages ("X vs Y"):** no study found.

## Q4. Negative findings, hype and spam-policy risk; Q5. Time to impact

### Takeaway
Google's spam policies now explicitly name "attempting to manipulate generative AI responses in Google Search" as spam, and scaled content abuse is judged by intent, not by whether AI wrote the content. The documented duds are keyword stuffing, schema-as-GEO-lever, llms.txt and the GEO rewriting methods under competition. On timing, live-retrieval engines can cite a new page within days to weeks, but the data is thin and vendor-sourced. Model training data changes only with model releases.

### Cited Findings
- **Google spam policies (last updated 2026-08-28).**
  - Spam includes "attempting to manipulate generative AI responses in Google Search".
  - Scaled content abuse means "many pages are generated for the primary purpose of manipulating search rankings", including mass generation with generative AI tools.
  - The site reputation policy covers third-party content "published on a host site mainly because of that host's already-established ranking signals".

  — [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- **Enforcement timing (secondary trade press).**
  - The AI-manipulation wording was reportedly added around May 15, 2026.
  - Spam updates followed in late June 2026 and on Aug 18–21, 2026.
  - I did not verify the dates against Google announcements.

  — [WebProNews](https://www.webpronews.com/google-tightens-rules-on-ai-search-manipulation/); [AIOSEO](https://aioseo.com/google-june-2026-spam-update/); [GSQI case studies](https://gsqi.com/marketing-blog/august-2026-google-spam-update-case-studies/)
- **Hype or failed tactics.** Each failure, its grade and its source:
  - Keyword stuffing: negative (A). — [arXiv 2311.09735](https://arxiv.org/html/2311.09735v3)
  - Most C-SEO rewriting methods: ineffective or negative (A). — [arXiv 2506.11097](https://arxiv.org/abs/2506.11097)
  - Schema: null for AI citations (A-). — [Ahrefs](https://ahrefs.com/blog/schema-ai-citations/)
  - llms.txt: unused by engines (D, Google). — [SERoundtable](https://seroundtable.com/google-ai-llms-txt-39607.html)
  - Single-run AI rank tracking: unreliable (C). — [WARC](https://www.warc.com/content/feed/llms-produce-random-results-when-listing-brand-recommendations/en-GB/11352)
- **Time to first citation (C; vendor study, maxaeo, 740 new pages, Feb–May 2026).** Median days to first citation:

  | Engine | Median days |
  |---|---|
  | Perplexity | about 4 |
  | Google AI Mode | about 6 |
  | ChatGPT web search | about 11 |
  | Claude with web | about 22 |
  | All engines | about 13 (about 4 of them spent on indexing) |

  A Semrush test, reported secondhand, found AI Mode cited 36% of test pages within 24 hours, against 8% for ChatGPT Search. — [maxaeo](https://maxaeo.ai/blog/time-to-citation-ai-search/)
- Other time estimates are undisclosed guesses, for example 4–8 weeks for AI Overviews and 1–3 weeks for ChatGPT. — [ainora](https://ainora.lt/blog/how-fast-can-i-rank-in-chatgpt-perplexity)
- **Freshness via updates (B).** This supports re-crawl-driven effects in retrieval engines within months. — [Seer 2026](https://www.seerinteractive.com/insights/study-content-recencys-impact-on-ai-visibility-in-2026)

### Inferences
- For BrandPulse's sales story, there are two timelines:
  - **Weeks:** on-site and listing changes, picked up by retrieval-grounded answers (Perplexity, AI Mode, Gemini with grounding, ChatGPT search).
  - **Months to model cycles:** the model's parametric "knowledge" of a brand (ungrounded answers). This depends on accumulated web mentions before the next training cutoff.
- BrandPulse's audit engine uses Gemini with Google Search grounding, so it measures the retrieval-driven layer. Fixes should be able to show up in re-audits within weeks. Repeated runs are needed to beat answer variance.
- "Guaranteed AI ranking" claims and tactics like hidden text or prompt injection are now explicit spam risks on Google surfaces. Client-facing offers should avoid them.

### Gaps
- I found no peer-reviewed study of time-to-impact on production engines.
- No study separates parametric (training) brand knowledge from retrieval-driven visibility over time.
- I could not verify the exact date the AI-manipulation sentence was added to Google's spam policy. Only the page's last-updated date (2026-08-28) was confirmed.
