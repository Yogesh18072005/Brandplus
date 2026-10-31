# Measuring a Brand's AI Search Visibility Reliably and Honestly (as of Oct 2026)

Research notes for the BrandPulse audit tool. Scope covers answer variance, industry metrics and tools, prompt selection, statistics, tracking over time, and business-impact attribution. Research date: 2026-10-23. Many sources are vendors that sell AI-visibility tracking, so their thresholds and figures may favour their own products. Each such case is flagged.

## 1. How variable are AI answers, and how many runs per prompt are needed?

### Takeaway
Exact brand lists and rank order almost never repeat across runs. The *frequency* with which a brand appears is much more stable and is the metric to report. Ten runs per prompt gives a rough estimate with about ±5–9 points of mean error. About 40 runs per prompt gets most prompts within ±5 points. About 100 runs per prompt is where vendors see diminishing returns. Cited sources also drift heavily from month to month (40–60% of cited domains are new after one month).

### Cited Findings
- SparkToro and Gumshoe study (Rand Fishkin and Patrick O'Donnell, published Jan 30, 2026, data collected Nov–Dec 2025):
  - Hundreds of volunteers ran 12 brand-recommendation prompts 2,961 times across ChatGPT, Claude and Google AI Overviews/AI Mode, with 60–100 runs per prompt per platform.
  - The chance of getting the same brand list twice was below 1%. The chance of the same list in the same order was below 0.1%.
  - In 994 headphone responses, the top brands (Bose, Sony, Sennheiser, Apple) each appeared in 55–77% of answers.
  - When 142 people wrote their own prompts for the same need, the prompts had a semantic similarity of only 0.081.
  - The study is not peer-reviewed, and Gumshoe sells tracking tools.
  - Sources: [Search Engine Journal](https://www.searchenginejournal.com/ai-recommendations-change-with-nearly-every-query-sparktoro/566242/); original post at [SparkToro](https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/) (returned 403 when fetched)
- The authors concluded that rankings swing widely while frequency of appearance is more consistent. They suggest percentage of responses as a more reliable metric than rank. Coverage reports top-brand visibility of 64% (ChatGPT), 73% (Claude) and 68% (Google AI). — [Communicate Online](https://communicateonline.me/news/ai-brand-recommendations-vary-marketers-warned-on-tracking-tools/), [Search Engine Land](https://searchengineland.com/ai-recommendation-lists-rarely-repeat-study-468076)
- Tight categories (for example, cloud providers) produced consistent top brands. Broad categories (for example, sci-fi novels) were scattered. — [Search Engine Journal](https://www.searchenginejournal.com/ai-recommendations-change-with-nearly-every-query-sparktoro/566242/)
- Graphite study, "Demystifying Randomness in AI" (Druck and Smith, Apr 14, 2026). Graphite is an AEO agency. — [Graphite](https://graphite.io/five-percent/demystifying-randomness-in-ai)
  - Data: 200 entity-comparison prompts with 400 API responses each from gpt-5.2-chat-latest. A Gemini 3 Flash check was also run.
  - Visibility mean absolute error at 10 responses: 5.6%, or 9.1% for entities with at least 10% visibility. For Gemini 3 Flash the figures were 5.5% and 8.6%.
  - 98.6% of prompts reached MAE of 10% or less at 10 responses. 94.9% of prompts reached MAE of 5% or less at 40 responses.
  - Position MAE at 10 responses was about 1.06 places (0.95 for Gemini).
  - Prompts near 50% visibility converge slowest.
  - Logged-out (scraped) responses were not meaningfully noisier for visibility. However, they surfaced different entity sets: cross-dataset similarity was 0.48, compared with 0.70–0.76 within a dataset.
  - About 10% of logged-out ChatGPT prompts triggered web search, compared with about 50% when logged in.
  - Observed/expected variance ratio was about 1.02, so runs behave roughly as independent draws.
- Graphite's recommendations:
  - Run each prompt at least 10 times.
  - Use sequential sampling: add runs until the confidence interval is narrow enough.
  - Use confidence intervals or significance tests before acting on a change.
  - Track weekly or biweekly, not daily.
  - Use a fresh chat with memory off.
  - Treat tools (API or logged-out) as directional, not ground truth.
  - Source: [Graphite](https://graphite.io/five-percent/demystifying-randomness-in-ai)
- Graphite on sequential sampling:
  - For a 15-point CI width, an entity near 50% needs about 167 responses, while an entity near 100% needs about 22.
  - The dataset average was 101 responses.
  - Sequential sampling averaged 89 responses, compared with 135 for fixed sampling.
  - Source: [Graphite](https://graphite.io/five-percent/demystifying-randomness-in-ai)
- Evertune (Jul 16, 2026; vendor), based on 10,700 ChatGPT prompts:
  - Margin of error was about 27 points at 5 repetitions, about 12 points at 12 repetitions and about 6 points at 100 repetitions, with diminishing returns beyond 100.
  - Evertune advises keeping the prompt list small and well-worded, because many unique single-sample prompts add noise.
  - Source: [Evertune](https://www.evertune.ai/resources/insights-on-ai/how-many-repetitions-of-a-single-prompt-does-it-take-to-understand-your-ai-visibility)
- Cloro (vendor, Aug/Sep 2026) and Gumshoe walkthrough:
  - A 25% rate over 72 answers gives about ±10 points. Over about 300 answers it gives about ±5 points.
  - Gumshoe estimates 97 runs for ±10 points and 385 runs for ±5 points on a single prompt and model.
  - Pooling prompts reaches the same precision: 10 related prompts × 39 runs, or 50 prompts × 8 runs, both give about ±5 points.
  - Detecting a move from 20% to 30% needs about 294 answers per period.
  - Paired runs of 20 prompts had a mean cited-domain overlap of 0.40, ranging from 0.06 to 1.00 (small sample).
  - Source: [Cloro](https://cloro.dev/blog/ai-visibility-sample-size/)
- Citation drift from Profound (vendor), using about 80,000 prompts per platform:
  - Share of cited domains in July 2025 that were absent in June 2025: Google AI Overviews 59.3%, ChatGPT 54.1%, Copilot 53.4%, Perplexity 40.5%.
  - Over January to July, 70–90% of cited domains changed.
  - The metric counts only newly appearing domains.
  - Source: [Profound](https://tryprofound.com/blog/ai-search-volatility)
- seoClarity tracked ChatGPT citations in five markets from Feb to May 2026. An apparent decline after March rebounded in May, which they interpreted as volatility rather than a trend. — [seoClarity](https://seoclarity.net/chatgpt-citation-decline-analysis) (via search summary; not fetched)
- Nondeterminism persists even at temperature 0:
  - [Atil et al., "Non-Determinism of 'Deterministic' LLM Settings" (arXiv 2408.04667)](https://arxiv.org/html/2408.04667v5) finds substantial run-to-run variation and argues single-run reporting is unreliable.
  - [arXiv 2601.19934 (Jan 2026)](https://arxiv.org/html/2601.19934v1) finds larger models vary more. A 120B model matched its own output in only about 12.5% of runs, and the paper attributes part of the variation to inference infrastructure (floating-point non-associativity).

### Inferences
- BrandPulse's current design (40 prompts × 1 Gemini run) gives a presence *rate across a prompt set*, which is legitimate. It cannot say anything reliable about any single prompt. A single absent answer is a sample, not a verdict.
- The "Where you're invisible" evidence quotes are real and verifiable, but they should be framed as "in this run" rather than "AI never recommends you for X".
- A cheap, honest upgrade is to run each prompt 3–5 times. With 40 prompts that gives 120–200 answers, which produces a business-level presence rate of roughly ±5–7 points.
  - Per-prompt claims are only possible if a prompt is "consistently absent" (for example 0/5), and should be labelled that way.
  - Cost: 3–5× the Gemini calls. Grounding is on the free tier per project memory, but daily limits apply.
- Rank or position should be a secondary metric at most, because it is the least stable quantity.
- Citation-gap lists change by roughly half each month. Present them as "sources AI leaned on this month", not a fixed truth.

### Gaps
- No public study found that quantifies variance specifically for the **Gemini API with Google Search grounding**, or for local or city-level queries such as "dentist in Delhi". Graphite's Gemini check used Gemini 3 Flash without isolating grounding.
- No rigorous study found on variance across accounts or locations, beyond Graphite's logged-in vs logged-out note. Location effects on local-business recommendations are unquantified in the sources found.
- No dedicated Ahrefs or Semrush volatility study for 2026 was found.

## 2. Industry metrics, how leading tools work, and pricing

### Takeaway
The industry has converged on four core metrics:
1. Mention rate, also called visibility or presence: the percentage of answers that mention the brand.
2. Share of voice: brand mentions divided by all tracked-brand mentions.
3. Average position when mentioned.
4. Sentiment.

Separate source/citation metrics are used for domains and URLs. Large tools source prompts from clickstream or panel data and run them daily with repeats. Pricing ranges from about $29/month (Otterly) to enterprise level (Profound, Evertune).

### Cited Findings
- **Peec AI** definitions — [Peec docs](https://docs.peec.ai/metrics-overview):
  - Brand metrics:
    - Visibility: the percentage of AI responses where the brand appears.
    - Share of Voice: brand mentions as a percentage of all tracked brands' mentions.
    - Position: average rank when mentioned (lower is better).
    - Sentiment: 0–100.
    - Win rate: the share of answers where the brand is ranked first ahead of every other named brand.
  - Prompt volume: a 1–5 relative score.
  - Domain source metrics:
    - Retrieved: the percentage of chats where a domain URL appeared as a source.
    - Cited: the percentage of chats where it was cited inline.
    - Citation share: the domain's share of all inline citations.
    - Citation position.
  - Peec separates **brand visibility** (the name is mentioned) from **source visibility** (the domain is used or cited) and notes the two can diverge.
- Peec runs prompts once daily per model. A guide advises waiting 7 days of daily runs before drawing conclusions. — [ecommercefastlane review](https://ecommercefastlane.com/peec-ai-review/), [metehan.ai](https://metehan.ai/articles/how-to-track-brand-visibility-in-ai-search)
- **Ahrefs Brand Radar** — [Ahrefs methodology (updated Feb 2026)](https://ahrefs.com/blog/brand-radar-methodology/), [Ahrefs help](https://help.ahrefs.com/en/articles/15501968-ai-visibility-metrics):
  - Builds questions from its keyword database plus People Also Ask and semantic fan-out.
  - Runs them monthly across ChatGPT, Perplexity, Gemini, Copilot, AI Overviews and AI Mode, with a 90-day reporting window.
  - A mention counts once per answer.
  - Share of voice is the percentage of total impressions vs competitors. "Estimated Impressions" weight mentions by Google search volume.
  - Ahrefs states the metrics are modeled, directional, and show potential rather than actual reach.
- **Semrush AI Visibility Toolkit** — [Semrush KB](https://semrush.com/kb/1607-ai-visibility-data), [Semrush AI SEO metrics](https://de.semrush.com/kb/1594-ai-seo-metrics):
  - AI Visibility score (0–100) combines Topic Coverage (how many topics include the brand, compared with other domains) and Mention Consistency (how often the brand appears within those topics). The weighting is not published.
  - Prompts come from AI clickstream data plus Google AI Overview keyword data. The database is cited as 289M or 317M prompts depending on the page version.
  - Refresh cadence: daily rolling according to the KB, monthly according to a review.
- **Semrush Enterprise** promotes persona-based prompt generation. — [Semrush Enterprise](https://enterprise.semrush.com/resources/article/persona-based-prompt-tracking/)
- **Profound**:
  - Tracks Visibility Score, Visibility Rank and Share of Voice per prompt. — [Profound prompt tracking](https://www.tryprofound.com/features/answer-engine-insights/prompt-tracking)
  - Its "Prompt Volumes" product claims 1.3B+ real queries plus 170M/month. A glossary instead says 400M+ conversations from double-opt-in panels across 10 countries. The figures conflict and are unverified. — [inblog glossary](https://inblog.ai/glossary/prompt-volume), [Profound vs Peec](https://www.tryprofound.com/blog/profound-vs-peec-ai)
- **Evertune** — [Evertune methodology](https://www.evertune.ai/platform/methodology), [Evertune prompt tracking](https://www.evertune.ai/research/insights-on-ai/how-evertunes-prompt-tracking-works):
  - Samples each prompt 100 times per model.
  - Prompts come from an "EverPanel" of more than 150M user conversations.
  - Uses both the developer API and the consumer interface.
  - One post describes 125 prompts × 100 runs × 10+ engines, or about 1.25M prompts per brand per month.
- **Gauge** supplies scraped logged-out ChatGPT and Gemini responses, as used in Graphite's study. — [Graphite](https://graphite.io/five-percent/demystifying-randomness-in-ai)
- **Bing Webmaster Tools AI Performance report**:
  - Public preview since Feb 2026.
  - Shows citations of your pages in Copilot and Bing AI answers, plus "grounding queries" (reinterpreted queries, not raw prompts), with citation share.
  - Includes no click data.
  - Sources: [Practical Ecommerce](https://www.practicalecommerce.com/bings-improved-ai-performance-section), [Search Engine Land](https://searchengineland.com/bing-webmaster-tools-testing-new-ai-performance-report-468039)
- **Pricing (2026)**. Third-party guides give conflicting figures, and some are written by vendors. — [frase.io](https://frase.io/blog/the-10-best-ai-visibility-tools-in-2026), [eclincher](https://www.eclincher.com/articles/profound-alternatives-8-ai-visibility-tools-after-profounds-pricing-change), [alhena (vendor)](https://alhena.ai/blog/profound-alternatives/), [dupple](https://dupple.com/blog/best-ai-search-visibility-tools-2026)

  | Tool | Reported price (2026) | Notes |
  |---|---|---|
  | Otterly.AI | $29/month | 15 prompts |
  | Semrush AI Visibility Toolkit | About $99/month per domain | Annual billing; 25 prompts; ChatGPT, Google AI, Gemini, Perplexity |
  | Peec AI | About $80–100/month | Plans cap prompts at 50, 150 or 350 ([Cloro](https://cloro.dev/blog/ai-visibility-sample-size/)) |
  | Scrunch | About $250–300/month | |
  | AthenaHQ | About $270–295/month | |
  | Ahrefs Brand Radar | About $129–199/month and up | |
  | Profound | Previously $99/$399 tiers | Reportedly removed from the public pricing page by mid-Sep 2026 |

  Cheapest plans often omit engines that the tool advertises.

### Inferences
- BrandPulse's metrics (presence rate, weighted visibility score, share of voice, per-competitor presence, citation gap) already match industry conventions.
  - The weighted 0–100 "visibility score" is a proprietary composite, as everyone's is. It should be footnoted with its formula.
  - Presence rate should be the headline, because it is the most stable and the easiest to explain.
- Adding a "brand vs source visibility" split costs almost nothing, because the data is already there (`brand_mentioned` vs `brand_cited`). It is a recognized industry distinction.
- The big tools track 15–350 prompts with daily repeats. A one-shot 40-prompt Gemini audit is a *snapshot*, not tracking, and should say so.

### Gaps
- Exact formulas for the Profound, Scrunch, AthenaHQ, Trakkr and BrightEdge scores were not found in public docs.
- Official 2026 pricing pages were not fetched directly. All prices above come from third-party roundups.

## 3. Selecting buyer questions that represent real demand

### Takeaway
No platform publishes its raw query logs, so every "prompt volume" figure is a modeled estimate. The defensible approach is a small, fixed, justified prompt set:
- Built from real customer language: sales calls, inbound enquiries, reviews.
- Supplemented by keyword data and People Also Ask, converted into conversational questions.
- Spread across intents and personas.
- Free of the brand name and free of leading wording.

### Cited Findings
- AI platforms do not publish query logs, so all prompt-volume numbers are estimates. — [inblog glossary](https://inblog.ai/glossary/prompt-volume)
- Prompt volume sources by vendor:
  - Ahrefs derives prompts from keyword and SERP data plus People Also Ask and fan-out. — [Ahrefs](https://ahrefs.com/blog/brand-radar-methodology/)
  - Semrush uses AI clickstream plus AI Overview keywords. — [Semrush KB](https://semrush.com/kb/1607-ai-visibility-data)
  - Profound and Evertune use consumer panels. — [inblog](https://inblog.ai/glossary/prompt-volume), [Evertune](https://www.evertune.ai/platform/methodology)
  - Peec uses a relative 1–5 bucket. — [Peec docs](https://docs.peec.ai/metrics-overview)
- Semrush recommends mining sales and customer-success transcripts, discovery notes and onboarding feedback for goals, switching triggers and decision criteria. — [Semrush Enterprise](https://enterprise.semrush.com/resources/article/persona-based-prompt-tracking/)
- AirOps says 3–5 well-defined personas based on the real ICP outperform many vague ones, and recommends revisiting them quarterly. — [AirOps](https://university.airops.com//tutorials/how-do-i-add-personas)
- Profound advises converting SEO keywords into conversational questions rather than pasting keyword lists. — [Profound](https://www.tryprofound.com/blog/how-to-design-prompts-for-ai-visibility-tracking)
- SE Ranking:
  - Sources prompts from keyword conversion, PAA/AI Overviews, forums and competitor sites.
  - Filters them by competitive relevance, influenceability, business intent and scope.
  - Warns against over-weighting "best [category]" prompts.
  - Source: [SE Ranking](https://seranking.com/blog/how-to-cho)
- Eseospace:
  - Suggests a fixed set of 20–50 prompts built from sales calls, inbound emails and reviews.
  - Notes that Google Search Console's AI-features reporting gives impressions, not query text.
  - Notes that Bing shows grounding queries, which are not full user prompts.
  - Source: [eseospace](https://eseospace.com/blog/how-to-build-a-geo-prompt-set/)
- Evertune advises avoiding leading or biased prompts, such as naming the brand or adding constraints. — [Evertune](https://www.evertune.ai/resources/insights-on-ai/how-many-repetitions-of-a-single-prompt-does-it-take-to-understand-your-ai-visibility)
- Human-written prompts for the same need are very diverse (semantic similarity 0.081). Any fixed set is therefore a sample of how people ask. — [Search Engine Journal](https://www.searchenginejournal.com/ai-recommendations-change-with-nearly-every-query-sparktoro/566242/)

### Inferences
- For each prompt, the audit should store a `source`/`justification` field: sales-call, GSC query, PAA, competitor page, service-list, location variant, or LLM-generated. The report should state "40 questions generated from your category/city, reviewed by us".
- Small, cheap stack for justification:
  - The client's service list × city/neighbourhood × budget modifier.
  - GSC queries (classic search queries are still the best free demand signal).
  - PAA scraped from SERPs.
  - Gemini-expanded paraphrases.
  - Founder review.
- Generate 2–3 paraphrases per buyer intent. This reflects the diversity of real phrasing and lets results be pooled per intent, which is more stable than single phrasings.
- Never include the client's brand name in discovery prompts. Branded prompts ("is Nova Dental good?") belong in a separate, labelled sentiment section.

### Gaps
- No validated public method was found for estimating local-business prompt volume (for example, Delhi dentists). Panel-based volume data is enterprise-priced and skewed toward the US and English.

## 4. Statistics: confidence intervals and presenting uncertainty

### Takeaway
Use the **Wilson score interval** for mention rates. It behaves well with small n and with rates near 0% or 100%, where the naive ±1.96·√(p(1−p)/n) interval fails. Graphite uses Wilson in practice.

At n=40 the intervals are wide (often ±10–15 points). Big gaps such as 5/40 vs 29/40 are still clearly significant. Present the results as ranges or with plain-language qualifiers, and label every score as specific to this question set, this engine and this date.

### Cited Findings
- Brown, Cai and DasGupta (2001) show that the standard Wald interval has erratic, poor coverage even at moderate n, and recommend Wilson (or Agresti–Coull, or Jeffreys) for small n. — [Statistical Science 16(2)](https://projecteuclid.org/journals/statistical-science/volume-16/issue-2/Interval-Estimation-for-a-Binomial-Proportion/10.1214/ss/1009213286.full); formula at [Wikipedia: Binomial proportion confidence interval](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval)
- Graphite reports Wilson intervals:
  - 16/20 gives a 95% CI of 58.4%–91.9%, and an 80% CI of 66.5%–89.0%.
  - With 10 responses, 1/10 gives 1.8%–40.4%.
  - Graphite recommends CIs or significance tests before acting on changes, and skepticism toward small differences.
  - Source: [Graphite](https://graphite.io/five-percent/demystifying-randomness-in-ai)
- Cloro recommends reporting the answer count as the denominator, and reporting per engine rather than pooled. A change smaller than the interval should be reported as "no detectable change". — [Cloro](https://cloro.dev/blog/ai-visibility-sample-size/)
- Ahrefs labels its own metrics "modeled", "directional" and "potential visibility", not reach. — [Ahrefs](https://ahrefs.com/blog/brand-radar-methodology/)
- Wilson 95% intervals I computed for this audit's typical numbers (formula from the Wikipedia source above; my 16/20 result matches Graphite's figure exactly):

  | Result | Wilson 95% interval |
  |---|---|
  | 5/40 | 5.5%–26.1% |
  | 6/40 | 7.1%–29.1% |
  | 27/40 | 52.0%–79.9% |
  | 29/40 | 57.2%–83.9% |
  | 0/40 | 0%–8.8% |
  | 10/200 | 2.7%–9.0% |
  | 20/200 | 6.6%–14.9% |
  | 60/200 | 24.1%–36.7% |

### Inferences
- Caveat: Wilson assumes independent, identical trials. 40 *different* prompts are not identical trials. Each has its own true rate, so the interval describes "this question set" and not "all buyer questions".
  - With repeats per prompt, the better approach is a cluster bootstrap: resample prompts, then runs within prompts. This is cheap to implement in TypeScript.
- Client-friendly presentation:
  - Show "5 of 40 (likely range 6–26%)" or a bar with a light range band.
  - Use verbal labels: "clear gap" when intervals don't overlap, "too close to call" when they do.
  - Add a footnote: "Measured on 40 buyer questions on Gemini (Google Search grounding), [date]. AI answers vary run to run; this is a snapshot, not a permanent ranking."
- Two-proportion comparisons (brand vs competitor on the same prompts) are paired, because they come from the same answers. McNemar's test on discordant prompts is the appropriate significance check if one is ever needed.

### Gaps
- No source was found that tested how non-technical business owners interpret uncertainty bands in sales reports. The presentation advice above is inference.

## 5. Tracking over time: baselines, frozen sets, citation diffs, attribution of changes

### Takeaway
Freeze the prompt set and the engine/model configuration, and establish a multi-run baseline. Then compare weekly aggregates with confidence intervals, and log every intervention and model change. Use control prompts or pages (comparable topics you did not touch) to separate real effects from engine-wide drift. Citation diffs should track both domains added and domains dropped.

### Cited Findings
- Graphite recommends weekly or biweekly tracking, because daily tracking risks treating noise as signal. — [Graphite](https://graphite.io/five-percent/demystifying-randomness-in-ai)
- Cloro:
  - Weekly aggregates are the smallest sound unit for a mid-size prompt set.
  - Alert on windows (for example, below 15% for 7 consecutive days), not on single answers.
  - Its four-week plan uses two baseline weeks: 60 prompts give 5,040 answers, enough for about ±5 points.
  - Source: [Cloro](https://cloro.dev/blog/ai-visibility-sample-size/)
- Profound's drift metric counts only *new* domains and ignores dropped ones. A fuller diff tracks both. — [Profound](https://tryprofound.com/blog/ai-search-volatility)
- Engine behaviour shifts with model releases; Graphite lists GPT-5, 5.1 and 5.2 released between Aug and Dec 2025. — [Graphite](https://graphite.io/five-percent/demystifying-randomness-in-ai)
- seoClarity's "decline" turned out to be volatility. — [seoClarity](https://seoclarity.net/chatgpt-citation-decline-analysis)
- GEO experiment design:
  - Controls can be comparable query families, markets, content sections or topic clusters, with randomization where feasible.
  - Version tracking, intervention logs and parallel controls are described as essential, because providers update models silently.
  - Source: [geosurge](https://geosurge.ai/corpus/gen-2979/empirical-software-engineering/production-geo-experimentation.html)
- Some tools offer test-vs-control URL groups (LLMPulse). SearchPilot markets GEO A/B testing. Neither has published results with disclosed methodology. — [LLMPulse](https://llmpulse.ai/features/geo-testing), [SearchPilot](https://searchpilot.com/)
- Vendor uplift claims, such as citation rates up 27% or more within 8 weeks (Ryze), are self-reported marketing without disclosed methodology. — [get-ryze.ai](https://www.get-ryze.ai/blog/geo-a-b-testing-how-to-prove-a-content-change-lifted-ai-citations)

### Inferences
- Implementation plan for BrandPulse:
  1. Store a `prompt_set_version` hash plus `model_id` and `grounding` flags with every audit.
  2. Baseline = at least 2 runs (ideally 3–5 per prompt) before any work starts.
  3. Re-measure every 2–4 weeks with the same frozen set and the same repeats.
  4. Report the delta with a Wilson or bootstrap CI, and say "no detectable change" when the intervals overlap.
  5. Split prompts into "targeted" (intents we wrote content or got listings for) and "control" (untouched intents). This works as a difference-in-differences: an effect is only claimed if targeted prompts rise more than control prompts.
  6. Keep an intervention log (date, what changed, which prompts it targets).
  7. Produce a citation diff per period: domains added and dropped, with counts.
- Never change the frozen set mid-engagement. New prompts go into a separate "v2" set and run alongside it.

### Gaps
- No peer-reviewed or published, well-documented GEO controlled experiment with results was found.

## 6. Attribution of business impact

### Takeaway
AI influence is mostly zero-click and under-attributed. Use three cheap, imperfect signals together:
1. A GA4 custom "AI assistants" channel based on referrer regex.
2. AI options in "how did you hear about us".
3. Branded-search lift in Search Console.

Report all three as directional.

### Cited Findings
- GA4 setup:
  - Create a custom channel group using a Source "matches regex" rule, for example `chatgpt.com|chat.openai.com|perplexity.ai|claude.ai|gemini.google.com|copilot.microsoft.com|edgeservices.bing.com`.
  - It must be ordered **above** Referral, or it never fires.
  - Do not restrict medium, because some ChatGPT traffic arrives as `(none)`.
  - Anchor the pattern, and avoid broad domains like google.com or openai.com.
  - Source: [Terminus](https://www.terminusapp.com/blog/tracking-ai-referral-traffic/), [Loves Data](https://www.lovesdata.com/blog/how-to-track-ai-traffic-ga4/)
- Undercounting in GA4:
  - Many AI clicks arrive without a referrer and land in Direct.
  - Google AI Overviews and AI Mode clicks appear as google/organic and cannot be isolated.
  - Sources disagree on whether custom channel groups apply retroactively.
  - Source: [Terminus](https://www.terminusapp.com/blog/tracking-ai-referral-traffic/)
- Two sources claim GA4 added a native "AI Assistant" channel on May 13, 2026. This is unverified against Google documentation. — [Terminus](https://www.terminusapp.com/blog/ai-traffic-channel-in-ga4/), [seoquick](https://seoquick.com.ua/en/ai-traffic-ga4/)
- Ahrefs calls self-reported "how did you hear about us" imperfect but about as close to truth as attribution gets, and suggests adding AI tools as options. — [Ahrefs](https://ahrefs.com/blog/how-to-measure-ai-search-visibility/)
- Branded-search lift in Search Console, plus direct-traffic lift, are proxies for zero-click influence. Rankscale warns against double-counting users across signals. — [AirOps](https://www.airops.com/blog/ai-search-pipeline-attribution), [Rankscale](https://rankscale.ai/resources/modules/reporting/attribute-ai-search-to-revenue)
- The Bing AI Performance report gives first-party citation counts for Copilot and Bing, with no clicks. — [Practical Ecommerce](https://www.practicalecommerce.com/bings-improved-ai-performance-section)

### Inferences
- For local service businesses such as clinics, the most practical signal is a front-desk or WhatsApp intake question ("Did you find us via Google, ChatGPT/AI, Instagram, referral?"), logged weekly. Pair it with GSC branded-query clicks and the GA4 AI channel.
- The audit report should promise "AI visibility" outcomes, not revenue attribution. Revenue claims cannot be proven cheaply.

### Gaps
- Claims of an "8x undercount" and a "2–4% self-report rate" in vendor content are unsourced rules of thumb, so they are excluded.
- A Google confirmation of the native GA4 AI channel was not found.
