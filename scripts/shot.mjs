// Dev-only verification helper (design-brief-v1 §7): renders a URL at a given
// viewport width and saves a screenshot. Not part of the shipped app.
//
//   node scripts/shot.mjs <url> <width> <outfile> [--full] [--wait=ms] [--selector=css] [--height=px]
//
// --full      full-page screenshot (default: viewport only)
// --wait=ms   settle time after load (default 1500; use ~6000 to let the hero replay finish)
// --selector  screenshot just one element (used for §4.5 report captures)
// --height    viewport height (default 900)

import { chromium } from 'playwright';

const [url, widthArg, outfile, ...flags] = process.argv.slice(2);
if (!url || !widthArg || !outfile) {
  console.error('usage: node scripts/shot.mjs <url> <width> <outfile> [--full] [--wait=ms] [--selector=css] [--height=px]');
  process.exit(1);
}
const width = Number(widthArg);
const full = flags.includes('--full');
const wait = Number((flags.find((f) => f.startsWith('--wait=')) ?? '--wait=1500').split('=')[1]);
const selector = (flags.find((f) => f.startsWith('--selector=')) ?? '').split('=')[1] || null;
const height = Number((flags.find((f) => f.startsWith('--height=')) ?? '--height=900').split('=')[1]);

const reduced = flags.includes('--rm'); // reduced motion → final states instantly (verifies layout below the fold)

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(wait);
if (selector) {
  await page.locator(selector).first().screenshot({ path: outfile });
} else {
  await page.screenshot({ path: outfile, fullPage: full });
}
await browser.close();
console.log(`saved ${outfile} (${width}px${selector ? `, ${selector}` : full ? ', full page' : ''})`);
