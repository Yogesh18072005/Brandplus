// Screenshot script for verification at different breakpoints.
// Usage: node scripts/screenshot.mjs [width] [filename]
import { chromium } from 'playwright';

const width = parseInt(process.argv[2] || '1440');
const filename = process.argv[3] || `.next/verify-${width}.png`;
const url = process.argv[4] || 'http://localhost:3333';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height: 900 },
  deviceScaleFactor: 1,
});

// Give the page time to render and let JS hydrate
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Scroll to bottom and back to trigger all IntersectionObserver reveals
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

await page.screenshot({ path: filename, fullPage: true });
console.log(`Screenshot saved: ${filename} (${width}px)`);

await browser.close();
