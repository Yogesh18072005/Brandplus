import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const out = 'outputs/design-review';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const urls = process.argv.includes('--references') ? [
  ['vercel', 'https://vercel.com'], ['framer', 'https://www.framer.com'],
  ['keyboard', 'https://ui.aceternity.com/components/keyboard'],
  ['aceternity-templates', 'https://ui.aceternity.com/templates'],
  ['videocaptions', 'https://videocaptions.ai'],
] : [['home', 'http://localhost:3000'], ['login', 'http://localhost:3000/sign-in']];
for (const [name, url] of urls) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${out}/${name}-before.jpg`, type: 'jpeg', quality: 55 });
    console.log(name, page.url(), (await page.locator('body').innerText()).slice(0, 700));
  } catch (error) { console.log(name, error.message); }
  await page.close();
}
await browser.close();
