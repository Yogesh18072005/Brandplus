# BrandPulse: The signal ring

The final launch film is `output/brandpulse-launch-15s-1080p60.mp4`.

- 15 seconds, 1920 × 1080, 60 fps, H.264 + stereo AAC.
- Four product moments: the audit (questions and answers), sources, the ranked plan, and approval.
- Real copy, logo geometry, Inter font and recorded proof from the current landing page.
- An original 120 BPM score composed with Web Audio's OfflineAudioContext. No third-party music samples.
- All visual time comes from `window.seek(seconds)`. No CSS animation, live timers or accumulated simulation state.
- Match-cut targets are measured from the actual DOM after Inter loads.
- Three Playwright subframes are averaged per final frame with FFmpeg `tmix`. A 180° shutter keeps type legible.

## Files

- `index.html`: portable single-file composition, with the font and soundtrack embedded.
- `film.html`: human-readable source template.
- `STORYBOARD.md`: locked beat-by-beat storyboard and content provenance.
- `score.js` / `score.wav`: original composition code and lossless PCM soundtrack.
- `hyperframes/`: compatible Hyperframes companion using an authentic paused GSAP timeline. It has external GSAP/audio to satisfy Hyperframes' asset requirements; the visuals use the exact same seek function.
- `../src/v8/Launch15.tsx`: Remotion wrapper for this same composition.
- `qa/`: beat sheets, full-size keyframes, deterministic seek checks and audio/framework verification.
- `references/`: captured real site references. Screenshots are reference material, never animated flat layers in the film.

## Rebuild

Run from `brandpulse-launch`:

```powershell
node v8/build.mjs
node v8/render.mjs audio
node v8/build.mjs
node v8/render.mjs qa
node v8/verify.mjs
node v8/render.mjs render
```

The renderer uses the existing Playwright installation, installed Chrome, Sharp, the static FFmpeg installed with imageio-ffmpeg, and the existing PyAV runtime for complete final-file decoding. Remotion's bundled FFmpeg/FFprobe crash on this PC, so the verified static build is used. Override its path with `BRANDPULSE_FFMPEG` if needed. Capture samples stream directly to three encoder workers; thousands of frame files are not written.

## Preview

Remotion composition ID: `BrandPulse-Launch-15`, 900 frames at 60 fps.

```powershell
node node_modules/@remotion/cli/remotion-cli.js studio --no-open --port=3101
node node_modules/hyperframes/bin/hyperframes.mjs preview v8/hyperframes --no-open --port=3102
```

Hyperframes lint passes with zero errors. Two structural recommendations suggest splitting the single HTML into sub-compositions; the single-file brief intentionally takes precedence.

## Content boundaries

The recorded example is the privacy-analytics audit dated 9 Oct 2026. Source counts are aggregated across eight answers, not attributed to one question. No fabricated uplift, clients, revenue, performance score, ranking gain or guaranteed AI recommendation is shown. Approval is an illustrative service workflow, as on the landing page.
