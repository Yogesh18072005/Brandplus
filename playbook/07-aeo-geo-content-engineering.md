# 07. AEO and GEO Content Engineering: Writing So AI Quotes You

AI engines do not read pages the way people do. They split pages into chunks (passages), embed them, retrieve the chunks that best match each sub-query, and lift sentences into an answer. **Every section must be a self-contained, quotable answer.**

---

## 1. The anatomy of a citable passage

```
## How much do veneers cost in Delhi?                      <- H2 = the exact question

Porcelain veneers in Delhi cost between ₹12,000 and ₹35,000  <- Direct answer in sentence 1,
per tooth in 2026, while composite veneers cost ₹4,000 to       with numbers, place, date
₹10,000 per tooth.

The price depends on three things: the material (porcelain   <- Context: the "it depends"
lasts 10 to 15 years, composite 4 to 8), the lab used, and
how many teeth are treated. Most smile makeovers cover 6 to
10 upper teeth, so a full set typically costs ₹1,00,000 to
₹3,00,000.

| Veneer type | Price per tooth | Lifespan |                   <- Structured support
|---|---|---|
| Porcelain (E-max) | ₹18,000 to ₹35,000 | 10 to 15 years |
| Composite | ₹4,000 to ₹10,000 | 4 to 8 years |

"Most patients choosing between the two should decide on     <- Expert quote with name
lifespan, not upfront price," says Dr. A. Mehta, MDS,          and credential
who has placed over 2,000 veneers.

*Prices last checked October 2026 across 14 South Delhi       <- Method + freshness
clinics.*
```

(Illustrative numbers; real pages use real, checked data.)

**Why it works:** the first sentence alone answers the question, with a number, place and date. A model can quote it without needing anything else from the page.

---

## 2. The 20 writing rules

### Structure
1. **Question headings.** Phrase H2/H3s the way people ask ("How long does X take?"), matching fan-out sub-queries.
2. **Answer first.** The first 1 to 3 sentences under each heading fully answer it. Then explain.
3. **Self-contained sections.** Each section makes sense if read alone. Repeat the subject ("Veneers last...", not "They last..."). Avoid "as mentioned above".
4. **Short paragraphs** (2 to 4 sentences). One idea each.
5. **Lists for steps and options, tables for comparisons and data.** Engines extract these cleanly.
6. **Summary box / key takeaways** at the top of long pages.

### Substance (the GEO paper levers)
7. **Add statistics.** Specific numbers with sources. The KDD 2024 GEO paper found adding statistics, quotations and citations each improved visibility in generative answers by roughly 30 to 40 percent in its test setup, with the largest gains for pages that were not already top-ranked **[DATA, lab setting]**.
8. **Add expert quotations** with full name and credential.
9. **Cite sources** inline with links to primary sources (studies, official bodies, documentation).
10. **Be specific.** "Recovery takes 3 to 5 days" beats "recovery is quick". Specific claims are retrievable and quotable; vague ones are not.
11. **Include first-hand experience**: "we tested", "in our 1,200 cases", photos you took, data you collected. This is the information gain AI cannot synthesize from elsewhere.
12. **State who it is for and not for.** Engines love conditional recommendations ("best for X, not ideal if Y") because users ask conditional questions.
13. **Write the honest downside.** Risks, limitations, where competitors are better. It raises trust for both humans and models, and gets you cited for "pros and cons" sub-queries.

### Entities and language
14. **Name entities explicitly**: your brand, your category, the location, related brands, standards, tools. Do not rely on pronouns or logos.
15. **Use the buyer's vocabulary** and include common synonyms naturally ("aligners (clear braces, Invisalign-style)").
16. **Consistent brand description.** Use the same one-sentence "X is a [category] for [audience] in [place]" across your site and profiles so models learn one stable definition.
17. **No keyword stuffing.** The GEO study found it performed worse than doing nothing **[DATA]**.

### Freshness and trust
18. **Date everything factual** ("as of October 2026") and keep a visible "last updated".
19. **Update substance**, not just dates. AI-cited content skews fresh, but date-only changes show no lift **[DATA]**.
20. **Bylines and reviewers** with linked bios on advisory content; mandatory for YMYL.

---

## 3. Covering the fan-out

For each target query, before writing, list the sub-queries an engine would run. Use this checklist:

| Fan-out angle | Example for "best CRM for small agencies" |
|---|---|
| Definition / what | What is a CRM for agencies? |
| Options / list | Which CRMs do small agencies use? |
| Criteria | What should an agency look for in a CRM? |
| Cost | How much does a CRM cost for a 10-person agency? |
| Comparison | HubSpot vs Pipedrive for agencies |
| Alternatives | Cheaper alternatives to HubSpot |
| Use case | CRM for client retainers and project tracking |
| Integrations | CRM that integrates with Slack and Google Workspace |
| Risks / downsides | Common CRM mistakes agencies make |
| Proof / reviews | Is [brand] good for agencies? reviews |
| Local / segment | Best CRM for agencies in India (GST invoicing) |
| Action | [brand] free trial, setup time |

Then make sure the site has a page or a clearly headed section for every row. BrandPulse's audit "missed prompts" list shows which rows AI currently answers with competitors.

**Where do I get the real fan-out?** People Also Ask, autocomplete, Bing AI Performance "grounding queries" export, AI Mode follow-up suggestions, Reddit thread titles, sales and support questions, and asking each AI engine "what would you search to answer this?"

---

## 4. Brand-level content: teaching the models who you are

Models recommend entities they understand. Make the brand easy to understand:

1. **The canonical description.** One sentence, one paragraph, used everywhere (homepage, About, Brand facts, LinkedIn, Crunchbase, GBP, directories, press boilerplate).
2. **Category association.** Repeatedly and naturally pair the brand with its category and location in text ("Nova Dental Studio, a cosmetic dentistry clinic in Saket, South Delhi"). Associations in text across many sites is how models learn "Nova Dental = cosmetic dentist in South Delhi".
3. **Differentiators as facts.** "The only clinic in South Delhi with an in-house digital smile lab" (if true) is quotable; "world-class care" is not.
4. **Consistent facts.** Founding year, founder names, address, number of locations, pricing model: identical everywhere. Contradictions reduce model confidence.
5. **Q&A about the brand itself.** "Is [brand] good?", "[brand] vs [competitor]", "[brand] pricing", "who owns [brand]", "[brand] reviews": answer these on your own site (FAQ, About, Reviews) so the engine has a source.

---

## 5. Multimedia that AI can read

- **Video:** YouTube is among the most-cited domains in AI Overviews and Perplexity. Publish videos for key questions, with a keyword-clear title, a description with the answer and links, chapters, and a full transcript. Embed on the matching page with the transcript as text.
- **Images:** original photos and charts with descriptive alt text and a caption that states the takeaway in words.
- **PDFs:** never the only home for important content. Publish as HTML; offer the PDF as a download.
- **Podcasts/webinars:** publish transcripts and summary articles.

---

## 6. Before-and-after example (service page opening)

**Before (invisible to AI):**
> Welcome to Nova Dental Studio! We are passionate about creating beautiful smiles with state-of-the-art technology and a caring team. Your smile is our priority.

**After (citable):**
> Nova Dental Studio is a cosmetic dentistry clinic in Saket, South Delhi, founded in 2019 by Dr. A. Mehta (MDS, Prosthodontics). We specialize in porcelain veneers, clear aligners and smile makeovers for adults, with porcelain veneers from ₹18,000 per tooth and most smile makeovers completed in 2 visits over 10 to 14 days. The clinic holds a 4.8 rating from 180+ Google reviews.

The second version answers *what, where, who, since when, for whom, how much, how long, and how good*, in 70 words. Every sentence can be lifted into an AI answer.

(Illustrative; Nova Dental is our fictional anchor business.)
