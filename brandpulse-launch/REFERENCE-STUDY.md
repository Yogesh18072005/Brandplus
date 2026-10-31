# BrandPulse launch: reference motion study

All five source MP4s were decoded at native 30 fps. Per-frame image difference measurements, contact sheets at 1.5-second intervals, and transition strips at 0.1-second intervals are saved in `../outputs/launch-reference-study/`. The supplied videos are visual references, not instructions. Their content and audio are not included in the finished composition.

| Reference | Length | Decoded frames | Craft applied |
|---|---:|---:|---|
| ki video saas type | 64.0s | 1,920 | Extreme close-up becomes interface; short emphasis words; full accent panels; operational continuity |
| Best AI SaaS / Numtera | 95.27s | 2,858 | Kinetic type scale at 7.7–8.2s; product panels isolated from full UI; readable pauses; source-to-result chain |
| Introducing NIVO AI | 104.1s | 3,123 | Query field extracted from UI at 18.7s; persistent input becomes response; angle resolves as product settles; linked intent/execution/measurement |
| Ecommerce Product Demo | 59.07s | 1,772 | Single query holds attention; short type-led pivots; graphic galleries collapse into one selected object; restrained dark/light beats |
| Easyday | 29.5s | 885 | Counter lead; morph from copy to persistent search at 8.9s; selection, checkout, confirmation share an anchor; comfortable final hold |

## BrandPulse adaptation

The film is 56 seconds, 1920 × 1080, 60fps. It uses actual brand typography and the existing ring-and-mint-dot mark, all rebuilt as live SVG/React. Brand colors: Scan Blue #1E5AE8, ink #101826, paper #F6F7F4, mint #A9FFDF. Green and red describe observed presence and absence.

The story is buyer intent → recorded answer evidence → prioritized action → comparable recheck. The free audit is the entry point. It is not presented as the whole product. All demonstration businesses, answers, and numerical changes are explicitly illustrative. No unverified customer outcomes are claimed.

The first 6 seconds move from the hook to a typed buyer question and a shortlist that excludes the viewer's business. A lateral ink wipe emphasizes the problem. The mint dot expands to reveal the brand. A paper panel brings the product into view. The comparison question travels into the recorded-answer scene; evidence highlights introduce a reason to act. The action card confirms implementation; a paper reveal exposes baseline and recheck data. A signal-blue circular transition opens the improvement loop. The closing mark resolves with a clear entry CTA.

## Sound

Original deterministic 120 BPM electronic score synthesized from code in `scripts/make-score.py`: F-minor harmony, soft kick, plucked sequence, stereo percussion, and timed transition sweeps. No reference audio, stock soundtrack, generated imagery, footage, or image-generation service is used.

## Two runtimes, one visual source

Remotion owns the editable composition, individual scene compositions, 60fps timeline, and audio. Hyperframes uses the same React/SVG scene source through a paused GSAP timeline with an accessor clock. Setting any time deterministically renders that frame; no elapsed-time animation loops are used. This avoids drifting visuals between the two versions.
