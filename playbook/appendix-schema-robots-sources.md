# Appendix: Schema Snippets, robots.txt, Sources

All snippets are JSON-LD in a `<script type="application/ld+json">` tag. Replace example values. Every value must match what is visible on the page. Validate with Google's Rich Results Test and validator.schema.org.

---

## 1. Organization (SaaS / non-local), on the homepage

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://example.com/#organization",
  "name": "Example",
  "alternateName": ["Example App", "Example Inc."],
  "url": "https://example.com/",
  "logo": "https://example.com/logo.png",
  "description": "Example is a CRM for small creative agencies that tracks clients, retainers and projects in one place.",
  "foundingDate": "2024-03-01",
  "founder": { "@type": "Person", "@id": "https://example.com/team/jane-doe#person", "name": "Jane Doe" },
  "contactPoint": { "@type": "ContactPoint", "contactType": "sales", "email": "hello@example.com" },
  "sameAs": [
    "https://www.linkedin.com/company/example",
    "https://x.com/example",
    "https://www.crunchbase.com/organization/example",
    "https://www.g2.com/products/example",
    "https://www.wikidata.org/wiki/Q000000"
  ]
}
```

## 2. LocalBusiness (dentist example), on home and location page

```json
{
  "@context": "https://schema.org",
  "@type": "Dentist",
  "@id": "https://example.in/locations/saket#location",
  "name": "Nova Dental Studio",
  "url": "https://example.in/locations/saket",
  "image": "https://example.in/images/saket-clinic.jpg",
  "telephone": "+91-11-00000000",
  "priceRange": "₹₹",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "12 Example Road, Saket",
    "addressLocality": "New Delhi",
    "postalCode": "110017",
    "addressRegion": "DL",
    "addressCountry": "IN"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 28.5245, "longitude": 77.2066 },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], "opens": "10:00", "closes": "19:00" }
  ],
  "areaServed": ["Saket", "Malviya Nagar", "Hauz Khas", "South Delhi"],
  "parentOrganization": { "@id": "https://example.in/#organization" },
  "sameAs": ["https://maps.google.com/?cid=0000000000", "https://www.practo.com/delhi/clinic/example"]
}
```

## 3. Service (service detail page)

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Porcelain veneers",
  "serviceType": "Cosmetic dentistry",
  "provider": { "@id": "https://example.in/#organization" },
  "areaServed": { "@type": "City", "name": "New Delhi" },
  "description": "Custom porcelain veneers, typically completed in 2 visits over 10 to 14 days.",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "INR",
    "priceSpecification": { "@type": "UnitPriceSpecification", "minPrice": 18000, "maxPrice": 35000, "priceCurrency": "INR", "unitText": "per tooth" }
  }
}
```

## 4. Product with Offer, shipping and returns (e-commerce)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Example Running Shoe v2",
  "sku": "ERS-V2-BLK-42",
  "gtin13": "0000000000000",
  "brand": { "@type": "Brand", "name": "Example" },
  "image": ["https://example.com/p/ers-v2-1.jpg"],
  "description": "Stability running shoe for flat feet, 9 mm drop, 280 g.",
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/products/ers-v2",
    "price": "6499.00",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock",
    "shippingDetails": {
      "@type": "OfferShippingDetails",
      "shippingRate": { "@type": "MonetaryAmount", "value": "0", "currency": "INR" },
      "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "IN" },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" },
        "transitTime": { "@type": "QuantitativeValue", "minValue": 2, "maxValue": 5, "unitCode": "DAY" }
      }
    },
    "hasMerchantReturnPolicy": {
      "@type": "MerchantReturnPolicy",
      "applicableCountry": "IN",
      "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
      "merchantReturnDays": 30,
      "returnMethod": "https://schema.org/ReturnByMail",
      "returnFees": "https://schema.org/FreeReturn"
    }
  }
}
```

## 5. Article with author (resources layer)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How much do veneers cost in Delhi? (2026 price guide)",
  "datePublished": "2026-10-01",
  "dateModified": "2026-10-12",
  "author": { "@type": "Person", "@id": "https://example.in/team/dr-a-mehta#person", "name": "Dr. A. Mehta", "url": "https://example.in/team/dr-a-mehta" },
  "reviewedBy": { "@type": "Person", "name": "Dr. B. Rao" },
  "publisher": { "@id": "https://example.in/#organization" },
  "mainEntityOfPage": "https://example.in/cost/veneers"
}
```
(`reviewedBy` is a `WebPage` property in schema.org; for strict validity put it on a `WebPage`/`MedicalWebPage` node that has the Article as `mainEntity`.)

## 6. Person (author, founder, doctor)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://example.in/team/dr-a-mehta#person",
  "name": "Dr. A. Mehta",
  "jobTitle": "Prosthodontist and Founder",
  "worksFor": { "@id": "https://example.in/#organization" },
  "alumniOf": "Example Dental College",
  "hasCredential": { "@type": "EducationalOccupationalCredential", "credentialCategory": "degree", "name": "MDS, Prosthodontics" },
  "knowsAbout": ["porcelain veneers", "smile design", "dental implants"],
  "sameAs": ["https://www.linkedin.com/in/example", "https://www.practo.com/delhi/doctor/example"]
}
```

## 7. BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.in/" },
    { "@type": "ListItem", "position": 2, "name": "Services", "item": "https://example.in/services" },
    { "@type": "ListItem", "position": 3, "name": "Porcelain veneers", "item": "https://example.in/services/veneers" }
  ]
}
```

## 8. FAQPage (optional)

Google retired FAQ rich results on 7 May 2026. The markup is harmless and may be used by other engines; keep it only if the Q&A is visible on the page.

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "How long do porcelain veneers last?", "acceptedAnswer": { "@type": "Answer", "text": "Porcelain veneers typically last 10 to 15 years with good care." } }
  ]
}
```

---

## robots.txt template

For a business that wants maximum search and AI visibility. Verify current user-agent names in each vendor's documentation before shipping.

```
# Search and AI search: allow
User-agent: Googlebot
User-agent: Bingbot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: Applebot
Allow: /
Disallow: /cart
Disallow: /account
Disallow: /api/

# Training crawlers: the client's licensing choice.
# Allowing helps future models know the brand. To opt out, change Allow to Disallow.
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
Allow: /

# Everyone else
User-agent: *
Allow: /
Disallow: /cart
Disallow: /account
Disallow: /api/

Sitemap: https://example.com/sitemap.xml
```

Remember: robots.txt only works if the CDN/WAF does not block these bots first.

---

## Sources

Platform documentation
- Google Search Central, AI features and your website (updated 10 Dec 2025): https://developers.google.com/search/docs/appearance/ai-features
- Google Search Central, spam policies and the March 2024 core update / spam policies announcement: https://developers.google.com/search/blog/2024/03/core-update-spam-policies
- OpenAI, overview of OpenAI crawlers: https://developers.openai.com/api/docs/bots
- OpenAI, commerce product feed spec: https://developers.openai.com/commerce/specs/feed
- GEO: Generative Engine Optimization (Aggarwal et al., KDD 2024): https://arxiv.org/abs/2311.09735

Studies and industry analysis (correlational, vendor-run; treat numbers as directional)
- Google AI Mode vs AI Overviews source selection: https://machinerelations.ai/research/google-ai-mode-vs-ai-overviews-source-selection-differences-2026
- How Google AI Mode and AI Overviews select sources: https://firstmotion.com/insights/how-google-ai-mode-and-ai-overviews-select-sources
- Brand mentions vs citations (Ahrefs 75k brands summary): https://wellows.com/blog/brand-mentions-vs-citation/
- What gets you cited in AI search, 2026 data: https://www.digitalapplied.com/blog/ai-search-citation-ranking-factors-2026-data-study
- AI citation platform overlap: https://authoritytech.io/curated/ai-citation-11-percent-platform-overlap-per-engine-audit-2026
- Improve brand visibility in ChatGPT: https://llmpulse.ai/blog/improve-brand-visibility-chatgpt/
- AI search engines cite Reddit, YouTube and LinkedIn most (Search Engine Land): https://searchengineland.com/ai-search-engines-cite-reddit-youtube-and-linkedin-most-study-473138
- Most cited domains by LLMs (Similarweb): https://aisearch.similarweb.com/blog/most-cited-domains-llms/
- Ahrefs, AI Overview citations: https://ahrefs.com/blog/ai-overview-citations-top-10
- Content freshness and AI citations: https://nogood.io/blog/content-freshness-ai-citations/
- What ChatGPT cites in 2026: https://www.gogochimp.com/blog/what-chatgpt-actually-cites-2026
- Listicle citation share shifts: https://www.marketmaze.me/p/chatgpt-listicle-citation-share and https://promptwatch.com/blog/are-listicles-still-relevant
- llms.txt adoption vs usage: https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/
- FAQ rich results retired: https://ppc.land/google-kills-faq-rich-results-what-seos-saw-coming-since-2019/
- Scaled content abuse in 2026: https://www.digitalapplied.com/blog/scaled-content-abuse-google-march-update-ai-pages-decimated and https://townsmithwp.com/guides/scaled-content-recovery/
- Bing AI Performance report: https://www.searchinfluence.com/blog/bing-ai-performance-report-copilot-citations/
- AAO definition: https://kalicube.com/entity/ai-assistive-agent-optimization/ and https://inblog.ai/glossary/aao
- Agentic commerce protocols: https://www.digitalapplied.com/blog/agentic-commerce-standards-ucp-acp-ap2-2026-merchant-guide and https://www.og1o.com/en/resources/blog/agentic-commerce-three-camps-ucp-acp-mcp and https://eco.com/support/en/articles/14839400-what-is-agentic-commerce-the-2026-guide
- WebMCP and agent-ready web: https://thenewstack.io/google-agent-ready-web/ and https://www.enhancely.ai/blog/webmcp-and-nlweb-two-new-standards-are-turning-websites-into-ai-interfaces
- Agentic browsers and SEO: https://susodigital.com/thoughts/what-agentic-browsers-mean-for-seo/

### Known uncertainties (re-verify before quoting to clients)
- Whether ChatGPT in-chat Instant Checkout (ACP) is still live: sources conflict.
- Exact current OpenAI product feed fields and delivery method: build from the official spec only.
- WebMCP browser support timeline: origin trial in 2026, stable date unconfirmed.
- Exact 2026 Google update dates and scope: check the Google Search Status Dashboard.
- Most percentages above come from single vendor studies; quote them as "one study found", never as fact.
