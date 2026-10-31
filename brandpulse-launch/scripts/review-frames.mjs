import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderFrames,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { mkdir, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import path from "node:path";
const root = process.cwd(),
  audit = process.argv.includes("--audit");
const out = path.join(root, "outputs", audit ? "qa-frames" : "hero-frames");
await mkdir(out, { recursive: true });
await mkdir(path.join(root, ".tmp"), { recursive: true });
await build({
  entryPoints: [path.join(root, "src/production.ts")],
  outfile: path.join(root, ".tmp/qa-production.mjs"),
  format: "esm",
  platform: "node",
  bundle: true,
});
const { shots, production, narration } = await import(
  "file:///" + path.join(root, ".tmp/qa-production.mjs").replaceAll("\\", "/")
);
const frames = new Set();
if (audit) {
  for (let f = 0; f < production.frames; f += 8) frames.add(f);
  for (const s of shots.slice(0, -1)) {
    const cut = Math.round(s.end * 30);
    for (let f = cut - 8; f <= cut + 8; f += 2)
      if (f >= 0 && f < 1800) frames.add(f);
    frames.add(cut - 1);
  }
  frames.add(1799);
} else
  for (const f of [
    35, 109, 155, 210, 285, 405, 525, 595, 705, 765, 875, 930, 1035, 1100, 1190,
    1265, 1370, 1455, 1545, 1620, 1710, 1775,
  ])
    frames.add(f);
const list = [...frames].sort((a, b) => a - b);
await writeFile(
  path.join(out, "sampling.json"),
  JSON.stringify(
    {
      production,
      audit,
      frames: list,
      cuts: shots.slice(0, -1).map((s) => Math.round(s.end * 30)),
      shots,
      narration,
    },
    null,
    2,
  ),
);
const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  outDir: path.join(root, ".tmp/qa-bundle"),
});
const browser = await openBrowser("chrome", { logLevel: "error" });
try {
  const composition = await selectComposition({
    serveUrl,
    id: "BrandPulse-Launch",
    puppeteerInstance: browser,
  });
  await renderFrames({
    serveUrl,
    composition,
    inputProps: {},
    puppeteerInstance: browser,
    frames: list,
    outputDir: null,
    imageFormat: "jpeg",
    jpegQuality: audit ? 78 : 90,
    scale: audit ? 0.5 : 0.75,
    concurrency: 4,
    muted: true,
    logLevel: "error",
    onStart: () =>
      console.log(
        `QA rendering ${list.length} ${audit ? "sample" : "hero"} stills; ${composition.width}x${composition.height}, ${composition.fps}fps, ${composition.durationInFrames} frames.`,
      ),
    onFrameBuffer: async (buffer, frame) =>
      writeFile(
        path.join(out, `frame-${String(frame).padStart(4, "0")}.jpg`),
        buffer,
      ),
    onFrameUpdate: (n) => {
      if (n % 40 === 0 || n === list.length)
        console.log(`${n}/${list.length} frames complete`);
    },
  });
} finally {
  await browser.close({ silent: true });
}
console.log(out);
