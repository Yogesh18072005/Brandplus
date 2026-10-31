# 09. AAO: Making a Business Usable by AI Agents

Assistive Agent Optimization (AAO; the term is credited to Jason Barnard / Kalicube, 2025, and is still not standardized) is about the final step: when an AI agent is told to *do* something for a user, it picks your business and completes the action.

The agent's question is not "is this relevant?" but **"can I verify this meets the user's constraints, and can I complete the task here?"**

---

## The 5 levels of agent readiness

Score each client 0 to 5. Most small businesses are at level 1.

| Level | Name | The agent can... | What it takes |
|---|---|---|---|
| 0 | Invisible | Not find or read the site | Crawl blocks, JS-only rendering, no index presence |
| 1 | Readable | Read what the business is | Server-rendered text, clear homepage and service pages |
| 2 | Verifiable | Check price, availability, location, hours, policies, ratings | Prices and terms in HTML + structured data; policies pages; reviews on platforms |
| 3 | Actionable | Complete a form, booking or signup | Clean, labeled forms; booking without login; stable URLs for actions |
| 4 | Transactable | Buy or book through feeds and protocols | Merchant feeds (Google Merchant Center, OpenAI product feed), platform agentic checkout (UCP/ACP via Shopify, etc.), booking integrations (Reserve with Google) |
| 5 | Callable | Use the business as a tool | MCP server or WebMCP tools exposing search, availability, quote, booking |

Target for most clients in 2026: **level 3**, **level 4** for e-commerce and bookable services. Level 5 for SaaS and larger businesses, as the standards mature.

---

## Level 1 to 2: Readable and verifiable

### The constraint data agents check
Put every one of these in **plain HTML text** and in **structured data**:

| Constraint | Where | Schema |
|---|---|---|
| What exactly is offered | Service/product pages | `Service`, `Product` |
| Price or price range, currency, what is included | Product/service/pricing pages | `Offer.price`, `priceRange`, `PriceSpecification` |
| Availability / stock / lead time | Product pages, booking | `Offer.availability`, `deliveryLeadTime` |
| Location, service area | Contact, location pages | `address`, `geo`, `areaServed` |
| Hours including holidays | Contact, location pages, GBP | `openingHoursSpecification`, `specialOpeningHoursSpecification` |
| Shipping cost and time | Policy + product pages | `OfferShippingDetails` |
| Returns, refunds, cancellation | Policy pages, summarized on product pages | `MerchantReturnPolicy` |
| Ratings and reviews | Reviews hub + third-party platforms | `AggregateRating` where eligible |
| Accepted payment methods, insurance, financing | Pricing/FAQ | `paymentAccepted`, `currenciesAccepted` |
| Eligibility / who it is for | Service pages | `audience` |
| Contact and response time | Contact page | `contactPoint` |

### Rules
- **No "call for price" as the only option.** Publish ranges and drivers.
- **No critical info in images or PDFs** (price lists as JPGs are invisible to most agents).
- **Machine-friendly units and formats:** "₹18,000 per tooth", "Mon to Sat 10:00 to 19:00", "Free returns within 30 days".
- **Keep it consistent** across site, GBP, feeds and directories. Agents cross-check; contradictions lower confidence.

---

## Level 3: Actionable (forms and booking)

Agents operating a browser (Gemini in Chrome, ChatGPT agent, Comet) need pages they can operate:

- [ ] Every form field has a visible `<label>` associated with it (`for`/`id`), sensible `name`, correct `type` (`email`, `tel`, `date`) and `autocomplete` attributes.
- [ ] Buttons are real `<button>` or `<a>` elements with clear text ("Book appointment", not an icon only); `aria-label` where needed.
- [ ] Required fields are marked; validation messages are text, not just red borders.
- [ ] The booking flow works without creating an account; account creation is optional or late.
- [ ] Deep links to actions exist: `/book?service=veneers`, `/pricing#team`, `/signup?plan=pro`.
- [ ] No surprise modals, cookie walls or chat popups blocking the first interaction.
- [ ] Bot protection is risk-based (for example invisible challenges on suspicious traffic) rather than a hard CAPTCHA on every booking; balance against spam.
- [ ] Confirmation page and email state the result in text (date, time, price, reference number).
- [ ] Accessibility (WCAG 2.1 AA) work doubles as agent readiness: if a screen reader can use it, an agent usually can.

### Local services: booking integrations
- **Reserve with Google** / booking links on Google Business Profile via supported scheduling partners.
- Booking platforms that agents and AI can read (Practo for doctors in India, Fresha/Booksy for salons, OpenTable/Zomato/Dineout for restaurants, Calendly-style public links for consultations).

---

## Level 4: Transactable (feeds and commerce protocols)

### E-commerce
1. **Google Merchant Center:** complete product data (GTIN, brand, condition, price, sale price, availability, shipping, returns, product highlights, high-quality images), no disapprovals, free listings enabled. This powers Google Shopping, AI Mode shopping, and Google's agentic checkout surfaces.
2. **OpenAI product feed** (ChatGPT merchants): submit per OpenAI's official feed spec when eligible; flags control whether products are discoverable and purchasable in ChatGPT. Third-party descriptions of this spec conflict, so always build from developers.openai.com. **[OFFICIAL + EMERGING]**
3. **Platform agentic commerce:** Shopify and other platforms expose UCP/ACP-based agent checkout and catalog channels; turn them on and test them. Building protocol integrations by hand is only for large merchants. Payment providers (Stripe, Adyen) are adding multi-protocol support. **[EMERGING]**
4. **Prices and stock in server HTML**, not injected by JavaScript: crawlers that do not run JS see stale or empty prices.

### Bookable services
- Real-time availability exposed through the booking platform or an API; booking confirmations via email/SMS.

---

## Level 5: Callable (MCP and WebMCP) **[EMERGING]**

- **MCP server** (backend): expose read and action tools such as `search_products`, `check_availability`, `get_quote`, `create_booking`. Best for SaaS (let agents use the product) and larger merchants. List it in relevant MCP registries.
- **WebMCP** (browser): declare forms and JS functions on the site as tools that in-browser agents can call via `navigator.modelContext`. A W3C Community Group proposal with a Chrome origin trial in 2026; build for it on high-value flows once it reaches stable in target browsers.
- **NLWeb** (Microsoft): natural-language query endpoint over the site's Schema.org data and feeds. Clean structured data now makes adopting it later trivial.
- **SaaS specifics:** public API docs, OpenAPI spec, a `/docs` that coding agents can read (markdown versions help), clear plan limits and pricing an agent can compare.

**Rule:** protocol work is a multiplier on levels 1 to 3, never a substitute. An MCP server for a business whose prices are inconsistent and whose reviews are thin does not get chosen.

---

## Agent traffic: measure and allow

- Identify agent traffic in analytics and logs: user agents like `ChatGPT-User`, `Perplexity-User`, `Claude-User`, and referrers such as `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`.
- Agentic browsers often look like normal Chrome; segment by behavior (fast form completion, no scroll) only for analysis, never to block legitimate users.
- Check that bot-management rules do not block declared AI user agents on booking and product pages.
- Watch conversions from AI referrers separately; they typically convert at higher rates because the user arrives pre-qualified.

---

## AAO checklist (copy into client audits)

- [ ] Prices or ranges for every offer in HTML text and schema
- [ ] Hours, address, service area in HTML and `LocalBusiness` schema, matching GBP
- [ ] Shipping, returns, cancellation policies on their own pages, summarized on product/service pages
- [ ] Reviews on the platforms AI cites; aggregate shown on site with links
- [ ] Booking/checkout works without login; labeled form fields; no hard CAPTCHA on step 1
- [ ] Deep links to key actions
- [ ] Merchant Center feed clean (e-commerce); OpenAI product feed if eligible
- [ ] Platform agent/AI channels enabled (Shopify etc.)
- [ ] AI user agents not blocked by WAF on product, pricing, booking pages
- [ ] AI referral and agent traffic tracked separately
- [ ] (SaaS) Public docs, API reference, pricing limits machine-readable; MCP server considered
