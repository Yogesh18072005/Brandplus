import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const out='outputs/design-review/v2';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const results=[];
for(const width of [1440,390]) {
 for(const [name,path] of [['home','/'],['demo','/demo'],['login','/sign-in'],['signup','/sign-up']]) {
  const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
   await page.goto(`http://localhost:3000${path}`,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForTimeout(3000);
   await page.screenshot({path:`${out}/${name}-${width}.jpg`,type:'jpeg',quality:75,fullPage:true});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   const text=await page.locator('body').innerText();
   if(name==='home') {
    await page.screenshot({path:`${out}/hero-${width}.jpg`,type:'jpeg',quality:80});
    await page.locator('#proof').scrollIntoViewIfNeeded();await page.waitForTimeout(2000);
    await page.locator('#proof').screenshot({path:`${out}/bento-${width}.jpg`,type:'jpeg',quality:80});
    await page.getByRole('button',{name:'Example action plan'}).click();
    if(await page.getByRole('button',{name:'Example action plan'}).getAttribute('aria-pressed')!=='true') throw Error('Action checkbox failed');
    await page.getByRole('button',{name:'Try another buyer question'}).click();
    await page.getByText('What are the alternatives?',{exact:true}).waitFor();
    await page.getByRole('tab',{name:'3 Understand'}).click();
    await page.getByText('Available source evidence',{exact:true}).waitFor();
    await page.getByRole('tab',{name:'4 Improve'}).click();
    await page.getByText('A focused comparison page',{exact:true}).waitFor();
    await page.locator('#how').screenshot({path:`${out}/walkthrough-${width}.jpg`,type:'jpeg',quality:80});
    await page.getByRole('button',{name:'Play walkthrough'}).click();
    await page.waitForTimeout(4700);
    if(await page.getByRole('tab',{name:'2 See'}).getAttribute('aria-selected')!=='true') throw Error('Walkthrough playback failed');
    await page.getByRole('button',{name:'Pause walkthrough'}).click();
    await page.locator('#audit').screenshot({path:`${out}/audit-${width}.jpg`,type:'jpeg',quality:75});
    if(width===390){await page.getByRole('button',{name:'Toggle menu'}).click();await page.getByRole('link',{name:'Pricing',exact:true}).first().waitFor({state:'visible'});await page.getByRole('button',{name:'Toggle menu'}).click();}
   }
   if(name==='demo') {
    await page.getByRole('button',{name:'02 How can I manage client feedback'}).click();
    await page.getByText('“Formwork keeps comments and approvals together in a shared project space.”').waitFor();
    await page.getByRole('tab',{name:'Your next move'}).click();
    await page.getByRole('heading',{name:'Show a complete client feedback workflow'}).waitFor();
    await page.getByLabel('Choose measurement').selectOption('example-5');
    await page.getByText('18 / 100',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Show workspace guide'}).click();
    await page.getByRole('tab',{name:'3 Understand'}).click();
    await page.getByText('Available source evidence',{exact:true}).waitFor();
    await page.screenshot({path:`${out}/workspace-tour-${width}.jpg`,type:'jpeg',quality:75,fullPage:true});
    await page.getByRole('button',{name:'Close workspace guide'}).click();
    await page.locator('.z-chart-table summary').click();await page.locator('.z-chart-table table').waitFor({state:'visible'});
   }
   results.push({name,width,overflow,errors,emDash:text.includes('—'),inputs:name==='login'||name==='signup'?await page.locator('input').count():undefined,passed:true});
  } catch(e){results.push({name,width,errors,error:e.message});}
  await page.close();
 }
}
// A normal-motion pass checks that the hero remains visible and WebGL initializes.
const motionPage=await browser.newPage({viewport:{width:1440,height:950}});
await motionPage.goto('http://localhost:3000/',{waitUntil:'domcontentloaded'});await motionPage.waitForTimeout(2000);
await motionPage.locator('#proof').scrollIntoViewIfNeeded();await motionPage.waitForTimeout(2000);
results.push({name:'motion-and-3d',canvasCount:await motionPage.locator('.at-sculpture canvas').count(),heroVisible:await motionPage.locator('h1').isVisible()});
await motionPage.close();
await browser.close();
await writeFile(`${out}/verification.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
