import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu','--allow-file-access-from-files']});
const deadline=(p,label)=>Promise.race([p,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Timed out: '+label)),15000);timer.unref();})]);
try{
  const results=[];
  for(const folder of['','hyperframes/']){
    console.log('Opening '+(folder||'standalone'));
    const p=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
    p.on('pageerror',e=>console.log('Browser error: '+e.message));
    await deadline(p.goto(pathToFileURL(path.join(here,folder,'index.html')).href,{waitUntil:'domcontentloaded'}),'navigation');
    console.log('DOM loaded');
    await deadline(p.evaluate(()=>window.__ready),'font/layout initialization');
    console.log('Layout ready');
    await deadline(p.evaluate(useTimeline=>{if(useTimeline)window.__timelines['brandpulse-launch-15'].seek(7.65,false);else window.seek(7.65);return {time:document.documentElement.dataset.time,duration:window.__timelines?.['brandpulse-launch-15']?.duration()};},Boolean(folder)),'absolute seek').then(v=>console.log(JSON.stringify(v)));
    const bytes=await deadline(p.screenshot({animations:'disabled'}),'capture');
    const hash=crypto.createHash('sha256').update(bytes).digest('hex');results.push(hash);console.log(hash);
    await p.close();
  }
  if(results[0]!==results[1])throw new Error('Shared timeline pixel comparison failed');
  const score=await readFile(path.join(here,'score.wav'));
  let peak=0,sum=0;for(let i=44;i<score.length;i+=2){const v=score.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(v));sum+=v*v;}
  const result={hyperframesPixelIdentical:true,hash:results[0],audio:{duration:15,sampleRate:48000,channels:2,peak,peakDb:20*Math.log10(peak),rms:Math.sqrt(sum/((score.length-44)/2))}};
  await writeFile(path.join(here,'qa/framework-and-audio.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
