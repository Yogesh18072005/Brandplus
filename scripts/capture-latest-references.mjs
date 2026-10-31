import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:'chrome'});
for(const [name,url] of [['aceternity-agency','https://productized-agency-template-acetern.vercel.app/'],['motionsites','https://motionsites.ai/']]){
 const page=await browser.newPage({viewport:{width:1440,height:950}});
 try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(2000);await page.screenshot({path:`outputs/design-review/${name}-reference.jpg`,quality:70,type:'jpeg',fullPage:true});console.log(name,await page.title());}catch(e){console.log(name,e.message);}await page.close();
}
await browser.close();
