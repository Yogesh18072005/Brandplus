import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('tmp/motion-review',{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [name,route] of [['home','/'],['demo','/demo'],['report','/r/citybond']]){
  const response=await page.goto(`http://localhost:3000${route}`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForTimeout(1800);
  await page.screenshot({path:`tmp/motion-review/${name}-${width}.png`,fullPage:true});
  await page.screenshot({path:`tmp/motion-review/${name}-${width}-viewport.jpg`,quality:75});
  results.push({name,width,status:response.status(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors:errors.splice(0)});
  if(name==='home'){
   await page.locator('.folder-trigger').click();await page.getByRole('button',{name:'03 / Next move',exact:true}).click();await page.locator('.folder-inspector').getByText('Turn evidence into action.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'After a recheck',exact:true}).click();await page.locator('.lens-chart strong').filter({hasText:'72'}).waitFor();
   await page.getByRole('button',{name:'Follow the signal',exact:true}).click();await page.locator('.pipeline-result').getByText('Northstar and Formwork are worth comparing.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Add to example plan',exact:false}).click();await page.getByRole('button',{name:'Added to your example plan',exact:false}).waitFor();
   await page.getByRole('tab',{name:'The evidence',exact:true}).click();await page.getByText('What a real report keeps',{exact:true}).waitFor();
   await page.getByRole('tab',{name:'Your next move',exact:true}).click();await page.getByText('Make your client workflow easier to evaluate.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Services',exact:true}).click();
   await page.locator('summary').first().click();
   results.push({width,landingInteractions:'PASS'});
  }
  if(name==='demo'){
   await page.getByRole('tab',{name:'Your next move',exact:true}).click();
   await page.getByRole('heading',{name:'Make creative approvals easy to compare',exact:true}).waitFor();
   await page.getByLabel('Choose measurement').selectOption('example-2');
   await page.locator('.signal-metric-value').first().filter({hasText:'36'}).waitFor();
   await page.getByRole('button',{name:'Show me around',exact:true}).click();
   results.push({width,dashboardInteractions:'PASS'});
  }
  if(name==='report'){
   await page.locator('.folder-trigger').click();await page.getByRole('button',{name:'02 / Observation',exact:true}).click();
   await page.getByRole('navigation',{name:'Report sections'}).getByRole('link',{name:'Evidence',exact:false}).click();
   results.push({width,reportInteractions:'PASS'});
  }
 }
 await page.close();
}
console.log(JSON.stringify(results,null,2));await browser.close();

