import { chromium } from 'playwright';

const [url, selector, outfile, widthArg = '1440'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(widthArg), height: 1000 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(url, { waitUntil: 'networkidle' });
const target = page.locator(selector);
await target.scrollIntoViewIfNeeded();
await page.waitForTimeout(1000);
await target.screenshot({ path: outfile });
await browser.close();
console.log(`saved ${outfile}`);
