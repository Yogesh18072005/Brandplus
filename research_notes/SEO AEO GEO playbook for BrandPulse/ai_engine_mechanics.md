# How AI Answer Engines Retrieve, Select and Cite Sources (as of Oct 2026)

Research date: 2026-10-23. Labels used: **[DOC]** = documented by the vendor; **[STUDY]** = third-party measurement; **[INFERRED]** = reverse-engineered or practitioner interpretation. Roughly 15 searches/fetches; many details still rest on vendor-SEO blogs and are flagged as such.

## Retrieval pipelines: which index each engine uses, when it searches, fan-out, reranking, read vs cited

### Takeaway
Every engine follows the same broad pattern: the model decides whether to search, rewrites the prompt into one or more sub-queries ("fan-out"), retrieves from a web index, and cites a small subset of what it read. The engines differ in the index and in how often they search. Google (AI Overviews, AI Mode, Gemini grounding) uses Google Search's own index. ChatGPT uses unnamed "third-party search providers" (strongly Bing-correlated) plus its own OAI-SearchBot crawl, and in free logged-out use it searches on only about 1 in 7 prompts. Perplexity and Claude run their own crawlers. Copilot is grounded in Bing.

### Cited Findings
**Google AI Overviews / AI Mode**
- [DOC] AI Overviews and AI Mode "may use a 'query fan-out' technique": they issue multiple related searches across subtopics and data sources. While a response is generated, the models find more supporting pages, so the links shown can be broader than in classic search. The two features may use different models, so their links differ. AI Overviews trigger only when Google judges them additive. (Page last updated 2025-12-10.) — [Google Search Central: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [DOC] Eligibility: a page must be "indexed and eligible to be shown in Google Search with a snippet". Google says "There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary", and that no AI text files or special schema are needed. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- [INFERRED] iPullRank (Mike King) reads Google patents as showing AI Mode breaking a query into "subintent" sub-queries, retrieving passages, and selecting citations at the **passage** level rather than the page level. The detailed taxonomy (for example "eight query variant types") is a practitioner reading of patent language; Google has published neither the taxonomy nor any counts. — [iPullRank webinar](https://ipullrank.com/resources/webinars/query-fan-out-webinar); [Digiday](https://digiday.com/media/wtf-is-query-fan-out-in-googles-ai-mode/); [Hartzer caveat](https://hartzer.it.com/query-fan-out/); [NoGood summary](https://nogood.io/blog/query-fan-out-guide/)

**ChatGPT search (OpenAI)**
- [DOC] ChatGPT search "leverages third-party search providers, as well as content provided directly by our partners." OpenAI has never named the providers. Any public site can appear if OAI-SearchBot is not blocked. "Placement is not guaranteed." Referral traffic carries `utm_source=chatgpt.com`. — [OpenAI Publishers & Developers FAQ (mirror)](https://help-lb.openai.com/en/articles/12627856-publishers-and-developers-faq); [Search Engine Land (SearchGPT launch, 2024)](https://searchengineland.com/searchgpt-launches-444399)
- [STUDY, Ahrefs, published 2026-10-12] Model GPT-5.6 Luna, free logged-out sessions, 66.6M responses from Aug–Sep 2026. Only **14.4%** of responses ran a web search, which means about 6 in 7 prompts were answered from parametric memory alone. Searching responses averaged about **1.6 fan-out queries**. 6.8% of fan-out queries used `site:` to search one domain; 75.9% of `site:` searches aimed at the ~160 most-searched domains targeted brand sites. Fan-out wording shifted: "official" rose from 10.1% to 13.1% of queries, and "price" from 6.04% to 8.88%. — [Relevant Audience summary of Ahrefs study](https://www.relevantaudience.com/geo/chatgpt-query-fan-out-citations-ahrefs-study/)
- [STUDY] Seer Interactive compared 500 ChatGPT citations with the top-20 results for 100 queries: citations matched Bing's top results 87% of the time and Google's 56%. — cited via [parse.gl](https://www.parse.gl/blog/bing-rankings-chatgpt-visibility). This conflicts with two other studies. Ahrefs, across 118,931 fan-out queries, found 83.39% of ChatGPT's chosen results do not appear in Google's results for the same query. Grow & Convert found only 27% of cited sources ranked on Google for the fan-out query, and 23% on Bing. — [Grow & Convert fan-out SERP study](https://www.growandconvert.com/ai/fan-out-query-serp-study/). Ahrefs suggests a hybrid of Bing and Google SERPs plus OpenAI's own index; that is [INFERRED].
- [STUDY] Earlier fan-out estimates: 2–4 fan-out queries per searching prompt. A Search Engine Land case study ran one prompt 68 times and got 25 unique fan-out queries, so the rewriting itself is stochastic. — [blckalpaca summary](https://blckalpaca.at/en/knowledge-base/seo-geo/geo-generative-engine-optimization/chatgpt-search-optimization-fan-out-queries-and-freshness-bias)
- [STUDY] Read vs cited: a report found "only 15% of pages retrieved by ChatGPT appear in final answers". This is a secondary aggregator; I did not verify the primary source. — [mean.ceo](https://blog.mean.ceo/?p=6965)

**Gemini API with Google Search grounding**
- [DOC] Flow: (1) the app sends a prompt with the `google_search` tool enabled; (2) the model decides whether a search would help; (3) if so, it generates and runs one or more queries; (4) it processes the results and writes the answer; (5) the response carries inline citations and the search steps. The model "handles the entire workflow of searching, processing, and citing information automatically." — [Gemini API: Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
- [DOC] Supported models listed (Oct 2026): Gemini 4 Argon, 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite, 3.1 Pro Preview, 3 Flash Preview, 2.5 Pro, 2.5 Flash, 2.5 Flash-Lite, 2.0 Flash. Older models use `google_search_retrieval`. Pricing: on Gemini 3 and newer, "your project is billed for **each** search query that the model decides to execute", with 5,000 free requests a month shared across models and then $14 per 1,000. Gemini 2.5 and older are billed per prompt. — [Gemini API docs](https://ai.google.dev/gemini-api/docs/google-search)

**Perplexity**
- [DOC] PerplexityBot is "designed to surface and link websites in search results on Perplexity", which implies Perplexity maintains its own index. — [Perplexity Crawlers doc](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md)
- [INFERRED/weak] SEO blogs describe a retrieve → rerank ("L3 reranker") → synthesize stack. One claims a March 2026 ranker update weighted publisher trust and recency more heavily and cut average citations per answer from 6.4 to 4.1. None of this is documented by Perplexity. — [gogochimp](https://www.gogochimp.com/blog/perplexity-seo)

**Microsoft Copilot**
- [DOC-adjacent] The Bing Webmaster Tools "AI Performance" report (public preview around Feb 2026) shows how often your URLs are cited in Copilot, Bing AI summaries and "some AI partner integrations". It also shows the **grounding queries** that triggered each citation; these are Bing's rewritten interpretation of the user's question, not the exact text typed. The data is sampled and exported as CSV only. — [Search Engine Land](https://searchengineland.com/bing-webmaster-tools-testing-new-ai-performance-report-468039); [Search Influence (20,000 citations)](https://www.searchinfluence.com/blog/bing-ai-performance-report-copilot-citations/); [Practical Commerce](https://www.practicalecommerce.com/?p=1564581)

**Claude**
- [DOC] Anthropic runs Claude-SearchBot, which "navigates the web to improve search result quality" (indexing for search), and Claude-User for user-initiated fetches. — [Anthropic help: crawlers](https://support.claude.com/en/articles/8896518)

### Inferences
- Visibility needs two independent things: (a) **parametric presence**, being in the model's training-data memory, which covers the ~85% of free-ChatGPT prompts that never search; and (b) **retrieval presence**, ranking in the relevant index (Google for Gemini and AI Overviews; Bing plus OpenAI's own crawl for ChatGPT; Bing for Copilot) for the *rewritten* fan-out queries, not the user's literal prompt.
- Fan-out queries increasingly include "official" and "price", and use `site:` on brand domains. This suggests an on-site official pricing or services page is becoming a retrieval target.
- Because citation selection appears to happen at the passage level, self-contained, quotable passages matter more than whole-page rank. This is [INFERRED] from iPullRank, not documented by Google.

### Gaps
- No vendor documents reranking criteria or how many pages are read versus cited. Gemini, Copilot and Claude publish no read-vs-cited ratio.
- I found no Microsoft primary documentation on how Copilot selects sources beyond Bing grounding.
- I found no reliable primary sources on Claude's search backend. Earlier reporting (2025) suggested Brave Search; this was not verified in this pass.
- The "15% retrieved → cited" figure is unverified at its primary source.

## What determines which brands get recommended in "best X for Y" answers

### Takeaway
Vendors document almost nothing beyond "be crawlable and indexed". Measurement shows that answers lean on a long tail of third-party sources, led by Reddit, YouTube, Wikipedia, LinkedIn and review sites such as G2 and Yelp. The mix shifts fast: ChatGPT moved sharply toward official and primary sources during 2026. The brand lists themselves are highly unstable from run to run, but how often a brand appears across many runs is fairly stable.

### Cited Findings
- [STUDY, Peec AI, Mar 2026, 30M sources, US] The top 10 cited domains were Reddit, YouTube, LinkedIn, Wikipedia, Forbes, G2, Yelp, Facebook, Medium and TechRadar. Reddit and YouTube are in every engine's top 5. Wikipedia is strong for ChatGPT and Perplexity but absent from Google's top 5. — [Peec AI](https://docs.peec.ai/research/most-cited-domains-in-ai-search); [by engine](https://docs.peec.ai/research/most-cited-domains-by-engine)
- [STUDY, Ahrefs, Google AI Mode, Jul 2026] Among the top 50 domains, YouTube had 21.1% of citations, Reddit 18.5%, Facebook 10.7% and Wikipedia 4.8%. — reported via [seo-day.de](https://www.seo-day.de/news/article/the-50-most-cited-websites-in-google-ai-mode-july-2026?lang=en); [bloggerspassion](https://bloggerspassion.com/most-cited-domains-in-ai-mode/)
- [STUDY] Concentration: an analysis of 200M prompts found no single domain usually exceeds about 5% of citations, so citations form a long tail. — [thrivestack](https://www.thrivestack.ai/research/ai-citation-sources-2026)
- [STUDY, Ahrefs, Mar–Sep 2026, US ChatGPT] Reddit fell from about 1 in 5 answers to about 1 in 43; Wikipedia fell from about 1 in 7 to about 1 in 35. PubMed rose from rank 64 to 4, and FDA entered at rank 8. Official sources were cited in 84.4% of factual answers and 68.3% of comparison answers. — [Relevant Audience / Ahrefs](https://www.relevantaudience.com/geo/chatgpt-query-fan-out-citations-ahrefs-study/). **This contradicts** the earlier 2026 studies that put Reddit at the top, so source mix depends heavily on model version and date.
- [STUDY, SparkToro + Gumshoe, early 2026] 2,961 prompts were run 60–100 times each on ChatGPT, Claude and Google AI Overviews/AI Mode. The chance of getting the same brand list twice was below 1 in 100; the authors call position tracking "effectively meaningless". Appearance rate was more stable: top brands appeared in about 64–73% of responses. Semantically different human phrasings still surfaced a consistent brand set. The study was not peer reviewed. — [Search Engine Journal](https://www.searchenginejournal.com/ai-recommendations-change-with-nearly-every-query-sparktoro/566242); [Search Engine Land](https://searchengineland.com/ai-recommendation-lists-rarely-repeat-study-468076); [Communicate Online](https://communicateonline.me/news/ai-brand-recommendations-vary-marketers-warned-on-tracking-tools/)
- [DOC] Google's AI-features guidance stresses standard SEO, text-form content, structured data that matches visible text, and keeping **Merchant Center and Business Profile** current. For local businesses, this is how entity data reaches Google's AI features. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- [STUDY/weak] For Perplexity, 92.78% of cited pages reportedly have fewer than 10 referring domains (FelloAI). If true, link authority matters less there than relevance. This is a secondhand figure. — [gogochimp](https://www.gogochimp.com/blog/perplexity-seo)

### Inferences
- For local "best X in city" prompts, the levers are: (1) presence in the third-party lists and directories the engines retrieve (review sites, Justdial-type directories, listicles, Reddit threads, YouTube); (2) a consistent entity (name, address, phone and category matching across Google Business Profile, directories and the website); and (3) parametric prominence, built slowly through repeated mentions in widely crawled sources.
- Because run-to-run variance is so high, any audit should report **appearance rate across prompts and runs**, not rank. Our scoring already does this; repeated runs per prompt would make it more defensible.

### Gaps
- No vendor (OpenAI, Google, Perplexity, Anthropic, Microsoft) publicly documents brand-selection signals for recommendations.
- I found no study isolating training-data prominence from retrieval effects for local SMBs, or any India-specific citation study.

## Gemini API grounding specifically: mechanics, groundingMetadata, and differences from the consumer Gemini app and AI Overviews

### Takeaway
Gemini API grounding is a tool call. The model decides whether to search, writes its own queries, and returns citations. In the classic `generateContent` response these come as `groundingMetadata`: `webSearchQueries`, `groundingChunks` (whose `web.uri` is a `vertexaisearch.cloud.google.com` redirect and whose `title` is the source domain), `groundingSupports` (text spans mapped to chunk indices) and `searchEntryPoint`. The current docs page now also describes a step-based format. The API answer is related to, but not the same as, the consumer Gemini app or AI Overviews.

### Cited Findings
- [DOC] The current Gemini docs page describes step-based fields: `google_search_call` (the queries executed), `google_search_result` (with `search_suggestions`, an HTML snippet for rendering the required Search Suggestions UI), and model output `annotations` with `url_citation` (`url`, `title`, `start_index`, `end_index`). Full usage requirements are in the Terms of Service. — [Gemini API: Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
- [DOC] In the classic format, `groundingChunks[].web.uri` is a `vertexaisearch.cloud.google.com` redirect and `title` is the source domain. `groundingSupports[]` pairs `segment.startIndex`/`endIndex` with `groundingChunkIndices`. Vertex AI Search grounding instead uses `retrievedContext` and `confidenceScore`; some examples spell the key singular as `groundingSupport`. — [Vertex AI grounding docs](https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-vertex-ai-search?authuser=8); [Gemini search-suggestions doc](https://ai.google.dev/gemini-api/docs/grounding/search-suggestions?hl=hi)
- [DOC] Google says AI Overviews and AI Mode may use **different models** and produce different links; both use query fan-out. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- [INFERRED, third-party] The grounding snippet is the exact text Gemini reads from a page. Grounding varies from run to run, and Gemini "pulls a small set of pages, and cites almost every one it actually uses". — [Tenten](https://geo.tenten.co/en/blog/gemini-grounding-explained); [maxaeo](https://maxaeo.ai/blog/how-to-get-cited-by-gemini/)
- [STUDY] Vercel/MERJ: Gemini "leverages Googlebot's infrastructure", so it has full JavaScript rendering, unlike the other AI crawlers. — [Vercel: The rise of the AI crawler](https://vercel.com/blog/the-rise-of-the-ai-crawler?ref=t01.li)

### Inferences
- For our audit tool: (1) the model may choose **not** to search, so log whether `webSearchQueries` or `google_search_call` is empty per prompt. An ungrounded answer measures parametric memory, which is a meaningful signal in itself. (2) Citation URLs are redirects, so derive `domain` from `title` (the domain) or resolve the redirect; matching on the raw `uri` host will always return vertexaisearch.cloud.google.com. (3) Logging the model's actual fan-out queries shows the client *what Google searched for*, which is useful report evidence. (4) Billing changes on Gemini 3+ (per search query executed), which matters for COGS. This is consistent with the project memory note that grounding is free only on 2.5-flash.
- The API answer should be labelled "Gemini (API, grounded)", not "what your customers see in the Gemini app". The consumer app adds personalization, location and memory, and may run a different model version (see next section).

### Gaps
- I did not find Google documentation explicitly comparing the API's grounded answers with the consumer Gemini app's or with AI Overviews.
- I could not locate DEJAN/Dan Petrovic's Gemini grounding research through search in this pass.
- Whether the redirect URIs may be stored or resolved, and for how long they stay valid, was not confirmed in the docs fetched.

## How API/agent answers differ from consumer apps, and the implications for measurement

### Takeaway
Consumer apps layer on memory, chat history, account personalization, precise location and often different or newer models and search-trigger thresholds. Logged-out free tiers search less. The best-documented evidence is indirect: studies explicitly scope themselves to "free, logged-out" sessions because those conditions change results. Measurement should therefore use many prompts and repeated runs, report appearance rates, and state its conditions.

### Cited Findings
- [STUDY] Ahrefs restricted its study to free, logged-out GPT-5.6 Luna sessions "so chat history and memory don't shape results". It notes that free logged-out sessions search less than paid or reasoning models, and that the data is a single model snapshot. — [Relevant Audience / Ahrefs](https://www.relevantaudience.com/geo/chatgpt-query-fan-out-citations-ahrefs-study/)
- [DOC] Google: AI Overviews and AI Mode can use different models, so their links differ even for the same query. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- [STUDY] Identical prompts give the same brand list less than 1% of the time, while appearance rate is relatively stable. — [SEJ / SparkToro](https://www.searchenginejournal.com/ai-recommendations-change-with-nearly-every-query-sparktoro/566242)
- [STUDY] One prompt run 68 times produced 25 unique fan-out queries. — [blckalpaca](https://blckalpaca.at/en/knowledge-base/seo-geo/geo-generative-engine-optimization/chatgpt-search-optimization-fan-out-queries-and-freshness-bias)

### Inferences
- In the report, state the conditions: "Measured via the Gemini API with Google Search grounding, model X, date Y, no personalization, city named in prompt". The API has no device location, so the city must be written into the prompt, which our prompt generation already does.
- Use appearance rate across about 40 prompts, ideally with 2–3 runs each, rather than rank. Our presence-rate metric is aligned with the best available evidence.

### Gaps
- I found no vendor documentation quantifying the difference between API and app answers.

## Crawler access: robots.txt user agents and JavaScript rendering limits

### Takeaway
Most vendors now separate **training**, **search indexing** and **user-initiated fetch** bots. A business that wants AI visibility should allow the search and user bots (OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, Googlebot, Bingbot). Blocking the training bots (GPTBot, ClaudeBot, Google-Extended) does not affect search or AI Overviews. Most AI crawlers do not run JavaScript, so content must be server-rendered.

### Cited Findings
- [DOC, OpenAI] **OAI-SearchBot** "is for search": it controls whether a site appears in ChatGPT search answers. Changes take about 24 hours, and opted-out sites can still appear as navigational links. **GPTBot**: "Disallowing GPTBot indicates a site's content should not be used in training generative AI foundation models." **ChatGPT-User**: user-initiated visits and GPT Actions; it "is not used for crawling the web in an automatic fashion", and "Because these actions are initiated by a user, robots.txt rules may not apply." **OAI-AdsBot**: visits only pages submitted as ChatGPT ads, and its data is not used for training. — [OpenAI crawlers](https://developers.openai.com/api/docs/bots)
- [DOC, Google] Googlebot's robots.txt rules control Search, including AI Overviews and AI Mode. Snippet controls (`nosnippet`, `data-nosnippet`, `max-snippet`, `noindex`) limit what appears in AI features. **Google-Extended** limits use for AI training and for "grounding in some other Google systems" (Gemini apps, Vertex AI), not AI Overviews. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features). Google's own wording, quoted secondhand: Google-Extended "does not impact a site's inclusion in Google Search nor is it used as a ranking signal". It is a robots token, not a separate crawler. — [Marie Haynes](https://www.mariehaynes.com/should-you-use-google-extended-in-robots-txt/)
- [DOC, Perplexity] **PerplexityBot** indexes for Perplexity search results and is "not used to crawl content for AI foundation models"; Perplexity recommends allowing it. IPs are published at perplexity.com/perplexitybot.json. **Perplexity-User** makes user-triggered fetches and "generally disregards robots.txt"; IPs are at perplexity.com/perplexity-user.json. — [Perplexity Crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md)
- [DOC, Anthropic] **ClaudeBot** collects possible training data; blocking it excludes future content from training. **Claude-User** makes user-initiated fetches; disabling it may reduce visibility in user-directed search. **Claude-SearchBot** indexes for search quality; disabling it may reduce search visibility. Anthropic honors `Crawl-delay` and does not publish IP ranges. — [Anthropic help center](https://support.claude.com/en/articles/8896518)
- [STUDY, Vercel/MERJ, likely Dec 2024] None of the major AI crawlers render JavaScript: GPTBot, ClaudeBot, OAI-SearchBot, ChatGPT-User, Meta-ExternalAgent, Bytespider and PerplexityBot. They fetch JS files (ChatGPT in about 11.5% of requests, Claude in about 23.84%) but never execute them. Googlebot and AppleBot render JS, and Gemini uses Googlebot's infrastructure. In the measured month, GPTBot made 569M requests and Claude 370M, about 20% of Googlebot's volume. ChatGPT's crawler spent 34.82% of its requests on 404s and Claude's 34.16%, against Googlebot's 8.22%. — [Vercel](https://vercel.com/blog/the-rise-of-the-ai-crawler?ref=t01.li)

### Inferences
- Client-side-rendered SPA sites (common among SMB site builders) can be invisible to ChatGPT, Perplexity and Claude while looking fine to Google. A "render without JS" check is a cheap, high-signal audit item.
- Check CDN and WAF bot-blocking (for example Cloudflare's default AI-bot blocking) as well as robots.txt. Google explicitly says to keep crawling allowed "in any CDN or hosting setup".

### Gaps
- The Vercel study date (late 2024) may be stale; I found no 2026 re-test showing whether OpenAI or Anthropic now render JS.
- I did not confirm Microsoft's Copilot-specific crawler tokens; Copilot is understood to rely on Bingbot and Bing's index.

## Agentic commerce and AI agents choosing vendors

### Takeaway
Both OpenAI and Google have shipped open checkout protocols that let the assistant complete purchases inside the answer. OpenAI's Agentic Commerce Protocol (ACP, with Stripe) launched in Sept 2025; Google's Universal Commerce Protocol (UCP) was announced Jan 2026 and is compatible with A2A, AP2 and MCP. Both are retail-product-centric and early. For service SMBs such as clinics and agencies, the near-term implication is structured, machine-readable offers (Merchant Center, Business Profile, accurate prices) rather than checkout integration.

### Cited Findings
- [Press] ChatGPT Instant Checkout launched in Sept 2025 for US users with Etsy sellers, with Shopify merchants (Glossier, Skims and others) said to be coming. ACP is an open standard co-developed by OpenAI and Stripe. Merchants pay a fee on completed purchases and remain responsible for fulfillment. PayPal adopted ACP in Oct 2025. In Feb 2026 OpenAI detailed an Instacart integration. — [Travel Daily News](https://www.traveldailynews.com/technology/chatgpt-launches-instant-checkout-with-the-agentic-commerce-protocol/); [Digital Commerce 360 (Feb 2026)](https://www.digitalcommerce360.com/2026/02/16/openai-expands-agentic-commerce-push/)
- [DOC/Press] Google's UCP was announced at NRF in Jan 2026 with Shopify, Etsy, Wayfair, Target and Walmart, and endorsed by Visa, Mastercard, PayPal, Stripe and Best Buy. It is compatible with A2A, AP2 and MCP. Merchants can add a checkout button to eligible listings in AI Mode and Gemini (US, Canada, Australia; select merchants, early-access form). Merchants stay seller of record and payment is via Google Pay. Related pilots: Business Agents and Direct Offers. — [TechCrunch (2026-01-11)](https://www.techcrunch.com/2026/01/11/google-announces-a-new-protocol-to-facilitate-commerce-using-ai-agents/); [Google Merchant Center help](https://support.google.com/merchants/answer/16837055?hl=en); [PYMNTS](https://www.pymnts.com/news/2026/google-debuts-universal-protocol-for-agentic-commerce/)
- [Study] ChatGPT fan-out queries increasingly contain "price" (up about 47% relative, Aug→Sep 2026), and retailers took 11.9% of `site:` searches. — [Relevant Audience / Ahrefs](https://www.relevantaudience.com/geo/chatgpt-query-fan-out-citations-ahrefs-study/)

### Inferences
- Agents increasingly verify on the brand's own site ("official", `site:`, "price"). Clear, crawlable pages for services, pricing ranges, location and hours make a business easier for an agent to select and cite.
- Positioning for BrandPulse: frame "AI agents choosing vendors" as the next step after AI visibility. Avoid promising checkout integration for service businesses, since these protocols currently target product retail in the US, Canada and Australia.

### Gaps
- I found no 2026 merchant-adoption numbers for ACP or UCP, and nothing on India availability.
- I found no documentation of MCP-based vendor discovery by consumer assistants for local service businesses.
