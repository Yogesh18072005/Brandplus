# BrandPulse — The signal ring

15 seconds · 1920 × 1080 · 60 fps · 120 BPM · 30 beats.

The launch brand is BrandPulse. The references to Viralgrow in the supplied brief are treated as template wording. Styling follows the current local landing-page redesign, viewed on http://localhost:3001: self-hosted Inter, paper, ink, #2874E1, rounded white surfaces and generous space. The public site was inspected at https://www.zerociate.com. Six interface references are saved in references/.

Through-line object: the signal ring, taken from components/brand/Logo.tsx. Its geometry becomes the UI affordance in each scene and returns to the original mark in the end lockup. The logo is rendered in a single brand-blue ink to honor the one-accent constraint.

| Beat | Seconds | Locked action |
|---|---:|---|
| 1 | 0.0 | Actual audit button; hook “AI picks someone.” unfolds. |
| 2 | 0.5 | Cursor clicks; ring leaves the button. |
| 3 | 1.0 | Ring interrupts “someone”. |
| 4 | 1.5 | Ring becomes a full-frame wipe, exceeding all four corners. |
| 5 | 2.0 | Ring becomes the question marker. |
| 6 | 2.5 | Buyer-question card unfolds. |
| 7 | 3.0 | Real analytics question is fully revealed. |
| 8 | 3.5 | Cursor selects the question; camera closes in. |
| 9 | 4.0 | Ring becomes a quote selector. |
| 10 | 4.5 | Recorded Gemini answer unfolds line by line. |
| 11 | 5.0 | Cursor drags across named-competitor text. |
| 12 | 5.5 | Audited startup’s “not named” status is revealed. |
| 13 | 6.0 | Selector becomes a source pin. |
| 14 | 6.5 | Actual source domains unfold around the pin. |
| 15 | 7.0 | Cursor selects plausible.io. |
| 16 | 7.5 | Its recorded “read in 4 of 8 answers” detail expands. |
| 17 | 8.0 | Pin becomes priority badge 1. |
| 18 | 8.5 | Ranked fix-plan rows unfold and sort. |
| 19 | 9.0 | Cursor selects the first action. |
| 20 | 9.5 | “Your first fix, ranked” fills the shot. |
| 21 | 10.0 | Badge becomes the approval marker. |
| 22 | 10.5 | Actual answer-page draft unfolds. |
| 23 | 11.0 | Cursor clicks Approve. |
| 24 | 11.5 | “You approved” lands; page opens into payoff. |
| 25 | 12.0 | Strongest musical hit: “Make it you.” |
| 26 | 12.5 | Signal ring moves through the key word. |
| 27 | 13.0 | Ring becomes the original logo mark. |
| 28 | 13.5 | brandpulse reveals outward from the ring. |
| 29 | 14.0 | “Get my free audit.” reveals. |
| 30 | 14.5 | Cursor lands and clicks; zerociate.com reveals. |

## Provenance

- Hero, audit button, workflow, draft approval: current landing page and corresponding source components.
- Question: PROOF_QUESTIONS[0].text in lib/marketing/proof-case.ts.
- Answer excerpt and named competitors: PROOF_QUESTIONS[0].quote and .named.
- Sources and counts: PROOF_SOURCES, aggregated over the eight recorded answers, not represented as all belonging to a single answer.
- Ranked actions: FIXES in components/landing/IsoScenes.tsx. Numeric impact scores are omitted.
- Draft title: PAGE_TITLE in components/landing/IsoScenes.tsx.
- No invented uplift, rankings, clients, testimonials, revenue or performance numbers. Draft approval is an illustrative workflow, as on the landing page, not a claimed customer result.

## Production

One self-contained HTML file. All visual properties derive from window.seek(t); there are no CSS animations, animation timers or accumulated simulation state. Match-cut coordinates come from measured real DOM anchors after Inter has loaded. A paused Hyperframes GSAP timeline controls the same seek function. Remotion embeds the identical composition for preview. An original OfflineAudioContext soundtrack has a kick every 0.5 seconds, syncopated percussion, a bass line and scene-change transients.

Before final rendering: inspect exact-beat contact sheets and representative full-size frames; check random-order seek determinism. Final capture: Playwright at three temporal samples per output frame, FFmpeg tmix groups of three, H.264 at 60 fps, original audio muxed to AAC.
