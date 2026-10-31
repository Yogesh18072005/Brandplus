import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
await mkdir(path.join(root, ".tmp"), { recursive: true });
const compiled = path.join(root, ".tmp", "production.mjs");
await build({
  entryPoints: [path.join(root, "src/production.ts")],
  outfile: compiled,
  format: "esm",
  platform: "node",
  bundle: true,
});
const { narration, shots } = await import(
  "file:///" + compiled.replaceAll("\\", "/")
);
await writeFile(
  path.join(root, "public", "narration-script.json"),
  JSON.stringify(narration, null, 2),
);
const format = (s) => `${s.toFixed(2)}s / f${Math.round(s * 30)}`;
let md =
  "# BrandPulse · The missing mention\n\n60 seconds · 1920 × 1080 · 30 fps · 120 BPM editorial grid (15 frames per beat). No music. Display: Manrope. Mono: IBM Plex Mono. Brand colors: #1E5AE8 / #101826 / #F6F7F4 / #A9FFDF.\n\nOpening plant: “UNEXPLAINED GAP”. Reveal payoff: “EVIDENCE CONNECTED”. This resolves the understanding/action problem; it does not invent a guaranteed AI recommendation.\n\nWebsite: https://www.zerociate.com/. Public retrieval was unavailable during production. Facts are grounded in its local primary source: PRODUCT.md, PRODUCT_STRATEGY.md, public/llms.txt, and implemented business/question/evidence/action/recheck flows.\n\n";
for (const n of narration) {
  md += `## ${n.id.toUpperCase()} · ${format(n.start)}–${format(n.start + n.duration)}\n\nVO: “${n.text}”\n\n`;
  for (const s of shots.filter((s) => s.chapter === n.id)) {
    md += `- **${format(s.start)}–${format(s.end)}**: ${s.subject}. **Camera:** ${s.move}; start ${JSON.stringify(s.from)}, end ${JSON.stringify(s.to)}. **Tracks:** ${s.track}. **Depth:** ${s.depth} **Out:** ${s.out}, cut at frame ${Math.round(s.end * 30)}.\n\n`;
  }
}
md +=
  "## Fact ledger\n\n- A free entry audit uses 10 buyer questions; no account or card is required at entry. Source: PRODUCT_STRATEGY.md, Acquisition.\n- Business context produces commercially relevant buyer questions. Source: PRODUCT.md and business-understanding/buyer-intent source.\n- Answers are recorded with question-level evidence and associated sources. Source: PRODUCT_STRATEGY.md, Report contract.\n- Prioritized actions link back to evidence. Source: PRODUCT_STRATEGY.md, Product promise.\n- A comparable recheck uses the same question set. Source: PRODUCT_STRATEGY.md, north-star outcome.\n- No customer lift, market reach, adoption count, founding year, model coverage promise, or guarantee is supplied or invented. Example records are labelled as demonstration UI.\n\n## Sound\n\nNeural English VO; brand pronounced zero-see-ate. No music. Signature hits at chapter accents, sub drops only in speech pauses, a restrained move sound at designed cuts, quiet UI at the focus of attention. Shared short-room tail, low-passed noise, speech-based ducking; no more than two simultaneous cue onsets per second.\n\n## QA sampling\n\nStills every 8 frames, every 2 frames within ±8 frames of a cut. Review sheets cover the full timeline. Full-size hero frames supplement the samples. Check text legibility, scene-edge crops, no static camera, transition alternation, and boundary pixel continuity.\n";
await writeFile(path.join(root, "SHOTLIST.md"), md);
console.log(
  `Shot list written: ${shots.length} shots, ${narration.length} VO sections.`,
);
