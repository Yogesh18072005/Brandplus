// Dev-only: like shot.mjs but deviceScaleFactor 1 (smaller files for inline review).
//   node scripts/shot-lite.mjs <url> <width> <outfile> [--wait=ms]
import { chromium } from 'playwright';

const [url, widthArg, outfile, ...flags] = process.argv.slice(2);
const width = Number(widthArg);
const wait = Number((flags.find((f) => f.startsWith('--wait=')) ?? '--wait=3000').split('=')[1]);
const fullPage = !flags.includes('--viewport');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(wait);
if (flags.includes('--diagnose-canvas')) {
  const canvasState = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return { found: false };
    const gl = canvas.getContext('webgl');
    const pixel = new Uint8Array(4);
    gl?.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return { found: true, width: canvas.width, height: canvas.height, hasWebGL: Boolean(gl), error: gl?.getError(), centerPixel: [...pixel] };
  });
  console.log(JSON.stringify(canvasState));
}
await page.screenshot({ path: outfile, fullPage });
await browser.close();
console.log(`saved ${outfile} (${width}px, 1x)`);
