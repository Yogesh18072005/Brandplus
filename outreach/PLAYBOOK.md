# Outreach playbook: AI Visibility Sprint

Goal: 3 paying Sprint clients ($299 founding price) by 2026-11-09.
Who: early-stage software companies (US/UK/EU, roughly under $10k MRR).

## One-time setup (Day 1–3)

1. Copy `prospects.template.csv` to `prospects.csv` (gitignored) and add 60 companies:
   Product Hunt launches from the last 3 months, Indie Hackers, "building in public" founders on X.
   Only `name`, `website`, `category` are required. Leave `competitors` empty: the tool finds them.
2. In `.env.local` set `NEXT_PUBLIC_BOOKING_URL` (a Cal.com link) or `NEXT_PUBLIC_CONTACT_EMAIL`,
   and `OUTREACH_BASE_URL` (your deployed domain).
3. Set up PayPal or Wise for USD invoices. Verification can take days, so do it now.

## Daily loop (8–10 prospects, ~2 hours)

```bash
npm run outreach -- outreach/prospects.csv                  # dry run: cost estimate, no spend
npm run outreach -- outreach/prospects.csv --confirm        # run (~₹10 per prospect, 15 questions)
npm run outreach -- --publish <slug>                        # make one report public (or --publish all)
```

Each audit now includes free website checks (robots.txt AI rules, schema, llms.txt,
sitemap, linked profiles) and a 0–100 score with a grade across five pillars.

```bash
npm run outreach -- --site all                              # add/refresh website checks on saved reports (free)
npm run outreach -- --pdf <slug> --base-url http://localhost:3000   # emailable A4 PDF (app must be running)
```

PDFs land in `data/outreach/pdfs/`. Set `NEXT_PUBLIC_FOUNDER_NAME` so reports are signed by you.

Then commit + deploy so the `/r/<slug>` links work. Drafted messages land in
`data/outreach/drafts-<date>.md`, and a running log in `data/outreach/index.csv`.

Before sending each message:
- Open the report link yourself and check the quotes make sense.
- Ask ChatGPT the top missed question and screenshot the answer (free, and founders care about ChatGPT most).
- Personalize the first line. Send it by hand: X DM, LinkedIn, or a 1:1 email.

## Rules (legal + reputation)

- One person, one relevant message. No bulk blasts, no automation.
- Every email: your real name, an honest subject, and the opt-out line the draft already includes.
  US (CAN-SPAM) also expects a postal address in commercial email.
- If someone says no, never contact them again. Skip Canadian prospects for cold email for now (stricter law).
- Never fake reviews, fake Reddit accounts, or numbers that aren't in the report.

## Pricing (private, never on the website)

The site shows no prices: pricing is scoped per company on the call. Before each call:

```bash
npm run outreach -- --quote <slug>
```

It reads the company's own audit and your rate card and prints the recommended tier, the
option to show second, the founding price, your writing cost and margin. Copy
`outreach/rate-card.example.json` to `outreach/rate-card.json` (gitignored) and set your
real numbers first. Get 3 real writer quotes before trusting the margin.

On the call: show their report first, then two options, 3-month minimum, first month upfront.

## When someone pays

1. Run their full audit: `--questions 40` on a one-row CSV with `--confirm`.
2. Do the Sprint work in the order the report's "What I'd fix first" lists.
3. Day 30: `npm run outreach -- --recheck <slug> --confirm`, then `--publish <slug>`.
   The report gains a before → after section on the same questions.
4. Ask for a testimonial, two referrals, and offer the $149/month plan.

## Budget guardrails

- Each batch is capped by `--max-inr` (default ₹60). The global cap in `.env.local` still applies.
- Answers are cached for the day, so re-running the same CSV the same day costs ₹0.
- Prices live in `lib/marketing/sprint.ts`.
