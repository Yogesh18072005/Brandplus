import { build } from "esbuild";
import { mkdir, copyFile, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const out = path.join(project, "hyperframes");
await mkdir(path.join(out, "audio"), { recursive: true });
await copyFile(
  path.join(project, "public/audio/brandpulse-final-mix.wav"),
  path.join(out, "audio/brandpulse-final-mix.wav"),
);
await copyFile(
  path.join(project, "node_modules/gsap/dist/gsap.min.js"),
  path.join(out, "gsap.min.js"),
);
await build({
  entryPoints: [path.join(project, "src/hyperframes-entry.tsx")],
  outdir: out,
  entryNames: "film",
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  loader: { ".woff2": "file" },
  assetNames: "fonts/[name]",
  define: { "process.env.NODE_ENV": '"production"' },
});
const css = await readFile(path.join(out, "film.css"), "utf8");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>BrandPulse · Get a way forward</title><script src="./gsap.min.js"></script><style>${css}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#F6F7F4}#root{position:relative;width:100%;height:100%;overflow:hidden}.clip{position:absolute;inset:0}</style></head><body>
<div id="root" data-composition-id="brandpulse-launch" data-width="1920" data-height="1080" data-start="0" data-duration="60"><div id="film" class="clip" data-start="0" data-duration="60" data-track-index="0"></div><audio id="brandpulse-original-score" src="./audio/brandpulse-final-mix.wav" data-start="0" data-duration="60" data-track-index="1" data-volume="1"></audio></div>
<script src="./film.js"></script><script>
document.fonts.ready.then(function(){
 let value=0;
 const clock={get frame(){return value},set frame(next){value=next;window.renderBrandPulse(Math.round(next));}};
 const tl=gsap.timeline({paused:true});
 tl.fromTo(clock,{frame:0},{frame:1800,duration:60,ease:'none'});
 tl.addLabel('The shortlist',0);tl.addLabel('The gap',6);tl.addLabel('Meet BrandPulse',12);tl.addLabel('Buyer questions',16);tl.addLabel('Answer evidence',21.5);tl.addLabel('The fix plan',27);tl.addLabel('Comparable recheck',32.5);tl.addLabel('Improvement loop',38);tl.addLabel('Your next move',56);
 window.__timelines=window.__timelines||{};
 window.__timelines['brandpulse-launch']=tl;
});
</script></body></html>`;
await writeFile(path.join(out, "index.html"), html);
console.log(
  "Hyperframes composition built from the shared React/SVG source. 60s · 1920 × 1080 · seekable GSAP timeline.",
);
