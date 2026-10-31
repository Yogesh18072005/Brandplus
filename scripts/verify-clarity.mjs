import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const dir = 'tmp/clarity-review';
await mkdir(dir, { recursive: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [name, route] of [['home', '/'], ['sign-in', '/sign-in'], ['sign-up', '/sign-up'], ['dashboard-demo', '/demo']]) {
      const response = await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(2200);
      await page.screenshot({ path: `${dir}/${name}-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${dir}/${name}-${width}-viewport.png` });
      results.push({ name, width, status: response.status(), url: page.url(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), h1: await page.locator('h1').allTextContents(), errors: errors.splice(0), authVisible: name.startsWith('sign-') ? await page.locator('.cl-rootBox').count() : undefined });
      if (name === 'home') {
        await page.getByRole('tab', { name: 'The evidence', exact: true }).click();
        await page.getByText('What a real report keeps', { exact: true }).waitFor();
        await page.getByRole('tab', { name: 'Your next move', exact: true }).click();
        await page.getByText('Make your client workflow easier to evaluate.', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Services', exact: true }).click();
        await page.getByRole('heading', { name: 'How do I choose a packaging supplier for a new product?' }).waitFor();
        await page.locator('summary').filter({ hasText: 'What does BrandPulse measure?' }).click();
        results.push({ width, previewTabs: 'PASS', sectorSwitch: 'PASS', faq: await page.locator('details[open]').count() === 1 ? 'PASS' : 'FAIL' });
      }
      if (name === 'dashboard-demo') {
        await page.getByRole('button', { name: 'Show me around', exact: true }).click();
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        await page.getByRole('heading', { name: 'Follow a buyer question.', exact: true }).waitFor();
        await page.screenshot({ path: `${dir}/guide-${width}.png`, fullPage: false });
        results.push({ width, guide: 'PASS' });
      }
    }
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
