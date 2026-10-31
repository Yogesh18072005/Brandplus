import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'outputs/design-review';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const findings = [];
for (const width of [1440, 390]) {
  for (const [name,path] of [['home','/'],['demo','/demo'],['login','/sign-in'],['signup','/sign-up']]) {
    const page = await browser.newPage({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(`http://localhost:3000${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3500);
      const text = await page.locator('body').innerText();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      await page.screenshot({ path: `${out}/${name}-${width}.jpg`, type:'jpeg', quality:75, fullPage:true });
      if (name === 'home') {
        await page.screenshot({ path: `${out}/hero-${width}.jpg`, type:'jpeg', quality:75 });
        await page.getByRole('tab',{name:'The evidence',exact:true}).click();
        await page.getByText('Follow the answer back to what supports it.').waitFor();
        await page.getByRole('tab',{name:'Your next move',exact:true}).click();
        await page.getByText('Show how your product handles creative approvals.').waitFor();
        await page.getByRole('button',{name:'Services',exact:false}).first().click();
        await page.getByText('Northline is missing from this answer.').waitFor();
        await page.getByRole('button',{name:'Try another buyer question',exact:true}).click();
        await page.getByText('How do the alternatives compare?',{exact:true}).waitFor();
        const checkbox = page.getByRole('checkbox').first(); await checkbox.check();
        if (!(await checkbox.isChecked())) throw Error('Checklist did not update');
        await page.locator('#proof').screenshot({path:`${out}/bento-${width}.jpg`,type:'jpeg',quality:75});
        await page.locator('#audit').screenshot({path:`${out}/audit-${width}.jpg`,type:'jpeg',quality:75});
        if (width === 390) { await page.getByRole('button',{name:'Toggle menu'}).click(); await page.getByRole('link',{name:'Pricing',exact:true}).first().waitFor({state:'visible'}); }
      }
      if (name === 'demo') {
        await page.getByRole('button',{name:'Next',exact:true}).click();
        await page.getByText('Read the answer behind the number.',{exact:true}).waitFor();
        await page.getByRole('button',{name:'Next',exact:true}).click();
        await page.getByRole('button',{name:'Explore my workspace',exact:true}).click();
        await page.getByRole('button',{name:'Show workspace guide',exact:false}).waitFor();
        await page.screenshot({path:`${out}/dashboard-${width}.jpg`,type:'jpeg',quality:75,fullPage:true});
        await page.locator('.z-chart-table summary').first().click();
        await page.locator('.z-chart-table table').waitFor({state:'visible'});
      }
      findings.push({name,width,url:page.url(),overflow,errors,hasEmDash:text.includes('—'),authForm: name === 'login' || name === 'signup' ? await page.locator('input').count() : undefined,interactions:'passed'});
    } catch (e) { findings.push({name,width,error:e.message,errors}); }
    await page.close();
  }
}
await browser.close();
await writeFile(`${out}/verification.json`,JSON.stringify(findings,null,2));
console.log(JSON.stringify(findings,null,2));
