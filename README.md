# AEO Engine

**A black-box evaluation harness for measuring the factual behaviour and manipulability of LLM outputs.**

AEO Engine takes a domain (an entity type and a location), automatically generates ~40 structured natural-language queries a real user would ask, runs them through an LLM with web search, and parses each response to measure **which entities the model names, which sources it cites, and the exact evidence it uses**. It produces a quantified, evidence-linked report.

It was originally built to check how often an LLM recommends a given business. In practice it functions as an evaluation harness: a fixed probe set, automated execution against a model, deterministic parsing, and quantified, evidence-linked outcomes.

---

## What it measures

- **Presence rate** — the fraction of queries in which the target entity is named.
- **Share of voice** — the target's presence relative to competing entities surfaced on the same queries.
- **Citation frequency** — how often each source is cited by the model across the query set.
- **Evidence** — every recorded mention links back to the verbatim sentence in the model's answer, so no claim is stored without a quote.

## How it works

1. **Query generation** — programmatically generates ~40 realistic queries spanning informational, comparative, and ready-to-act intents.
2. **Model execution** — runs each query through an LLM (currently Gemini with web search) via API, capturing the full response and cited sources.
3. **Response parsing + deterministic evidence extraction** — identifies named entities and cited sources; when a mention cannot be confirmed structurally, a deterministic fallback extracts the exact sentence naming the entity, so every measurement is quote-backed.
4. **Quantification + reporting** — aggregates into presence rate, share of voice, and citation counts, and renders an evidence-linked report.

## Why this is relevant beyond marketing

Running the harness at scale surfaces failure modes that matter for the reliability of LLMs as a factual interface:

- **Inconsistency** — presence varies sharply across semantically similar queries, with no signal to the user that an answer is unstable.
- **Confident unevenness** — models assert specific real-world claims with uneven, unobservable accuracy.
- **Manipulability** — the sources a model trusts are a small, identifiable, and often editable set, which means outputs can be deliberately steered. This is an information-integrity concern, not only a marketing one.

These map onto active questions in AI evaluation: factual reliability and grounding, adversarial manipulability, and silent failure.

## Status

Working prototype. Single model provider (Gemini). Concierge-run reports. Query generation is heuristic; manipulability is currently observed qualitatively rather than through controlled experiments.

## Roadmap

- Extend across multiple models to compare factual stability.
- Formalise the query set and intent taxonomy for reproducibility.
- Run controlled manipulability experiments: vary a trusted source, measure the causal shift in model recommendations.

---

*Built by Mehul Arora.*
