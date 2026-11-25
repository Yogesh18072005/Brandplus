# BrandPulse

[![BrandPulse CI](https://github.com/Yogesh18072005/Brandplus/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Yogesh18072005/Brandplus/actions/workflows/ci.yml)

> **AI Visibility Engine** — an evidence-backed platform that helps businesses understand how AI assistants represent their brand, identify visibility gaps, and prioritize improvements.

## Why this project matters

BrandPulse brings together full-stack product engineering, AI-assisted analysis, evidence validation, background job processing, and secure multi-tenant data access. Its core pipeline is designed to keep each stage traceable: business evidence → buyer questions → AI observations → gap diagnosis → approved interventions.

**Core engineering highlights**
- Five-stage, modular AI analysis pipeline with persisted audit lineage.
- Evidence-linked buyer-intent generation and answer observation.
- Background processing with queue, worker, retry, and approval workflows.
- Clerk authentication, Supabase-backed persistence, and server-side secrets.
- Cost controls and operational safeguards for provider-backed jobs.
- Automated TypeScript checks and regression tests through GitHub Actions.


**BrandPulse is an AI visibility and business-intelligence platform.** It builds an evidence-backed understanding of a business, generates buyer questions, observes AI answers, diagnoses visibility and evidence gaps, and creates prioritized interventions.

The application is a Next.js 16 / React 19 / TypeScript project backed by Supabase and Clerk. Gemini powers the live answer-observation and analysis workflows. Engine 02 can use local Ollama for buyer-intent generation, avoiding Gemini API calls for that stage.

## Product workflow

A canonical audit runs through five connected engines:

1. **Business Understanding** — crawls the business website and extracts structured entities and source-linked evidence.
2. **Buyer Intent** — generates and validates evidence-grounded buyer questions. The provider is selected with `BUYER_INTENT_PROVIDER` (`ollama` or `gemini`).
3. **AI Observation** — sends the frozen buyer questions to the configured answer provider and stores responses, mentions, and citations.
4. **Evidence Diagnosis** — evaluates observed answers against the business understanding and identifies supported gaps.
5. **Intervention Generation** — creates prioritized, evidence-linked recommendations. The execution workflow supports approval, cancellation, retries, and recorded artifacts.

The queue and worker coordinate long-running audit stages. Reports are assembled from the canonical audit lineage rather than from a single transient request.

## Technology

- Next.js 16, React 19, TypeScript
- Clerk authentication and account identity
- Supabase database, row-level security, and queue operations
- Google Gemini via the Google GenAI SDK
- Optional local Ollama for Engine 02
- Razorpay billing and Brevo transactional email
- Node.js test runner with `tsx`

## Local development

Use a supported Node.js version and install dependencies:

```powershell
npm install
```

Create a local `.env.local` file. Do not commit it or share its contents. The application needs the relevant Clerk and Supabase configuration; Gemini-powered stages require `GOOGLE_API_KEY`. The server-side Supabase client requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

For local Ollama-backed Buyer Intent, start Ollama and configure:

```dotenv
BUYER_INTENT_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_MS=120000
```

Alternatively set `BUYER_INTENT_PROVIDER=gemini` to use Gemini for Engine 02.

Start the Next.js application:

```powershell
npm run dev
```

Run the background queue worker in a separate terminal:

```powershell
npm run worker
```

The worker needs valid server-side Supabase credentials and a reachable Supabase project.

## Verification

Run these checks before opening or merging a code change:

```powershell
npm run typecheck
npm test
npm run build
```

Useful operational commands:

| Command | Purpose |
| --- | --- |
| `npm run worker` | Start the long-running queue worker |
| `npm run queue` | Process queue work once |
| `npm run queue:all` | Process all available queue work |
| `npm run audit:run -- <queue-id> --free --confirm` | Run an approved free/admin audit locally |
| `npm run audit:run -- <queue-id> --charge --confirm` | Run an approved user audit and reserve its credit |
| `npm run validate:env` | Check environment configuration |

## Repository structure

- `app/` — Next.js pages and API routes
- `components/` — dashboard, onboarding, report, and product UI
- `lib/` — authentication, Supabase clients, billing, queue, security, and report assembly
- `src/business-understanding/` — Engine 01
- `src/buyer-intent/` — Engine 02
- `src/ai-observation/` — Engine 03
- `src/evidence-diagnosis/` — Engine 04
- `src/intervention-generation/` — Engine 05
- `src/execution/` — intervention execution and approvals
- `supabase/migrations/` — database schema, policies, and database functions
- `scripts/` — worker, queue, audit, and operational scripts

## Operational notes

- Keep all secrets in local environment files or the deployment secret manager.
- Do not expose the Supabase service-role key to browser code.
- Engine 02 validates questions against canonical business entities and linked evidence; unsupported claims are rejected rather than invented.
- A successful build does not replace a live end-to-end audit test. Verify the queue, each engine stage, report rendering, citations, and billing behavior in the intended environment.


## Engineering architecture

```text
Next.js / React dashboard and API routes
             |
        Clerk identity
             |
    Server-side application layer
       |             |
 Supabase/Postgres  AI providers
       |             |
 Audit queue       Gemini / Ollama
       |
 Background worker
       |
 Evidence-based visibility report
```

## Resume project highlights

**BrandPulse — AI Visibility & Business Intelligence Platform**

- Developed a full-stack AI visibility platform using Next.js, React, TypeScript, Node.js, Supabase/PostgreSQL and Clerk.
- Built a multi-stage audit workflow for business context, buyer-intent discovery, AI visibility observations, evidence diagnosis and prioritized recommendations.
- Implemented background audit processing, report history and server-side API workflows.
- Integrated AI-provider workflows with configurable provider credentials and usage safeguards.
- Added GitHub Actions automation for type checking, automated tests and production builds.

BrandPulse uses Supabase/PostgreSQL; it is not a MERN-stack application. List only capabilities you have personally verified in a live deployment on your resume.

## Verification

The GitHub Actions workflow runs type checking, the test suite and a production build for pushes and pull requests to `main`. A successful CI run validates those automated checks with CI configuration values; live authentication, database, AI-provider, email and payment integrations still require real credentials and end-to-end testing.
