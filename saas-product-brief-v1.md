# Product Brief v1 — AI Visibility Platform (Hybrid SaaS + Service)

> Save this file in the project root alongside CLAUDE.md. CLAUDE.md remains the source of truth for the audit engine (types, adapters, parsing, scoring formulas, quota rules). This brief extends it into a customer-facing product. Where they conflict, this file wins.

---

## 0. Context — read before touching anything

An audit engine already EXISTS in this repo and is proven live: Gemini adapter with Google Search grounding, answer parser, prompt generator with intent stratification, day-caching, cost logging, CLI runner. **Do not rebuild it. Do not restructure it. Extend it.** Before writing any code, read the existing `src/` and confirm to me what's there.

The founder is a solo student on Gemini's free tier. Every design decision must respect: near-zero budget, free-tier rate limits (sequential calls, daily caps), and shipping speed over elegance.

## 1. What we're building (one paragraph)

A web product where a small business enters its name, category, city, and competitors → the existing engine runs a 40-prompt audit against AI search → they get a beautiful, shareable report showing how visible they are in AI answers vs competitors, with evidence quotes and the sources AI trusts. Free first audit (the hook), paid subscription for ongoing weekly tracking (₹-priced tiers), and a "done-for-you" service tier where the founder fixes the gaps manually (sold via the report, delivered off-platform for now).

Positioning: the AI-visibility tool for businesses that DON'T have a marketing team. Global tools (Peec €89/mo, Profound $499/mo) serve marketers; we serve the clinic owner in Delhi who has never heard of "share of voice."

## 2. Product principles

1. **The report is the product's face.** Every build decision optimizes for the moment a business owner opens their report and feels "AI is recommending my competitors and not me — and I can see the proof."
2. **One product, two price tags.** The service tier uses the SAME reports and dashboards. Never build service-only features.
3. **Free tier physics rule everything.** Audits are queued and run sequentially, never in parallel. Show honest progress ("Your audit is running — ~20 minutes") rather than pretending to be instant. If daily quota is exhausted, queue for tomorrow and say so.
4. **No fake anything.** No fabricated testimonials, no invented "920% growth" stats, no fake customer counts on the landing page. Credibility is the moat; a caught lie kills it.
5. **Every rupee of COGS is logged** per audit and per subscriber per month.
6. **Ask before:** any paid service, any schema migration, anything irreversible.

## 3. Phases — build strictly in order

### Phase A — finish the engine core (extends CLAUDE.md M2–M3)
- A1. Run the full 40-prompt audit end-to-end (may already be pending). Verify output quality with me.
- A2. Scoring module per CLAUDE.md §5.5: visibility score, presence rate, share of voice, per-competitor rates, per-engine rates, missed high-value prompts, citation gap. Pure functions, unit-tested with fixture data.
- A3. Report data contract per CLAUDE.md §5.6, generated from any completed audit.
- **Gate: show me a full JSON report for the Nova Dental example before Phase B.**

### Phase B — the report page + landing page (the faces)
- B1. Next.js (App Router) app in this repo. The CLI must keep working.
- B2. Report page at `/r/[id]`: renders the report contract. Sections per CLAUDE.md §6 (headline number, head-to-head bars, "where you're invisible" with evidence quotes, "who AI trusts," per-engine breakdown, soft CTA). Print/PDF-friendly. Publicly shareable link.
- B3. Landing page: hero with the audit-request form (business name, website, category, city, up to 3 competitors, email). Explains the problem in owner language ("When people ask ChatGPT for the best dentist in your area, are you the answer?"), shows a sample report, honest social proof only.
- B4. Audit request flow: form → queued job → email when ready (use a free-tier email service; ask me before signup) → link to report.
- **Gate: I review both pages in the browser before Phase C.**

### Phase C — accounts, billing, tracking (the SaaS)
- C1. Supabase: auth (email OTP), Postgres per CLAUDE.md §8 plus `users`, `subscriptions`, `tracked_audits`.
- C2. Dashboard for signed-in users: their audits, visibility trend over time, competitor comparison, citation-gap targets.
- C3. Razorpay subscriptions. **Pricing v1 (source of truth = `lib/billing/plans.ts`; this brief mirrors it):**
  - **Free — ₹0:** 1 project, 1 audit/month, 10 prompts/audit. No tracking.
  - **Starter — ₹999/mo:** 3 projects, 4 audits/month, 40 prompts/audit, weekly tracking + trends + email summary.
  - **Pro — ₹2,499/mo:** 10 projects, unlimited audits, 40 prompts/audit, weekly + daily tracking, priority queue.
  - Done-for-you (service) tier is "Contact us" — no self-serve checkout.
  - (Earlier drafts said Track ₹2,999 / Growth ₹7,999 — superseded 2026-07-04; the shipped code pricing above wins. Update `plans.ts` and this line together if pricing changes.)
- C4. Weekly cron (Vercel cron or Supabase scheduled function) re-running each subscriber's prompt set, sequential, quota-aware: subscribers first, free audits with leftover quota.
- C5. Basic ops: spend caps respected, per-audit cost stored, failed-run retries next day, admin view (can be a simple protected page) showing queue + quota use.
- **Gate: I do a full dry-run — signup → pay (test mode) → audit → weekly re-run — before anything goes live.**

## 4. Design requirements (Phase B/C frontends)

Follow the frontend-design skill in this environment, plus:
- Design for a business owner on a phone, not a marketer on a desktop. Mobile-first. Plain language, zero jargon — never "share of voice" without a plain-words gloss ("how often AI mentions you vs competitors").
- Before coding the landing/report pages, present me a short design plan: palette (4–6 named hex values), type pairing, layout concept, and ONE signature element that makes this un-mistakable for a template. Avoid the generic AI-design defaults (cream+serif+terracotta, black+acid-green, broadsheet hairlines). The subject is AI search — let the signature element come from that world (e.g., the report's evidence quotes styled as real AI-answer excerpts).
- The report must feel like a professional diagnostic a doctor would trust — restrained, precise, evidence-forward. The landing page can take one deliberate risk.
- Quality floor: responsive to 360px, keyboard focus visible, honest empty/error states ("Your audit is queued — free capacity resets daily" not spinners forever).

## 5. Non-goals for v1 (do not build)

- No multi-engine (Gemini-only until a paying customer funds more — CLAUDE.md M5 stands).
- No content-generation/auto-publishing features. No AI agents that "fix" anything. The fix layer is the founder's manual service.
- No team seats, roles, or agency features. No white-label. No API.
- No Hindi/multilingual UI yet (roadmap, not v1).
- No custom admin panel beyond one protected ops page.

## 6. Definition of done for v1

A stranger can: land on the site → request a free audit → get an email → open a report that makes them feel the gap → sign up → pay (test mode) → see weekly tracking populate. The founder can: see the queue, see costs, and export any report as PDF to use in service sales. All on free-tier infra with documented monthly COGS per subscriber.
