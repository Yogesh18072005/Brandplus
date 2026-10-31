import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import crypto from 'node:crypto';

const here=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(here,'..');
const require=createRequire(path.resolve(project,'../package.json'));
const {chromium}=require('playwright');
const sharp=require('sharp');
const ffmpeg=process.env.BRANDPULSE_FFMPEG||'C:/Users/HP/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const mode=process.argv[2]||'qa';
const out=path.join(here,'output');
await mkdir(out,{recursive:true});await mkdir(path.join(here,'qa'),{recursive:true});
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--disable-gpu','--hide-scrollbars','--disable-background-timer-throttling','--allow-file-access-from-files']});
const html=pathToFileURL(path.join(here,'index.html')).href;
async function page(){const p=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});p.on('pageerror',e=>console.error('PAGE ERROR:',e.message));await p.goto(html,{waitUntil:'domcontentloaded',timeout:20000});await p.evaluate(()=>window.__ready);return p;}
async function run(exe,args){const child=spawn(exe,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let result='',error='';child.stdout.on('data',d=>result+=d);child.stderr.on('data',d=>error+=d);const[code]=await once(child,'close');if(code!==0)throw new Error(`${path.basename(exe)} failed (${code}): ${error.slice(-4000)}`);return result;}
async function makeSheet(files,name,cols=5){const cellW=384,cellH=241,rows=Math.ceil(files.length/cols);const tiles=[];for(let i=0;i<files.length;i++){
  const label=`${(i*.5).toFixed(2)}s`;
  const tile=await sharp(files[i]).resize(384,216).extend({bottom:25,background:'#ffffff'}).composite([{input:Buffer.from(`<svg width="384" height="241"><text x="12" y="234" font-family="Arial" font-size="17" fill="#141925">${label}</text></svg>`),top:0,left:0}]).png().toBuffer();
  tiles.push({input:tile,left:(i%cols)*cellW,top:Math.floor(i/cols)*cellH});
}await sharp({create:{width:cols*cellW,height:rows*cellH,channels:3,background:'#e2e7f0'}}).composite(tiles).png().toFile(path.join(here,'qa',name));}
try{
  if(mode==='audio'){
    const p=await page();const b64=await p.evaluate(()=>window.composeBrandPulseScore());
    await writeFile(path.join(here,'score.wav'),Buffer.from(b64,'base64'));
    console.log('Original OfflineAudioContext score rendered: 15 s, 48 kHz, stereo PCM.');await p.close();
  }else if(mode==='qa'){
    const p=await page(),files=[],reports=[];
    for(let i=0;i<30;i++){
      const t=i*.5;await p.evaluate(t=>window.seek(t),t);
      const f=path.join(here,'qa',`beat-${String(i+1).padStart(2,'0')}.png`);
      await p.screenshot({path:f,animations:'disabled'});files.push(f);
      reports.push(await p.evaluate(()=>window.qaBrandPulse()));
    }
    await makeSheet(files,'all-30-beats.png');
    const samples=[.83,2.95,5.45,7.65,9.35,11.55,12.45,14.8];
    for(const t of samples){await p.evaluate(t=>window.seek(t),t);await p.screenshot({path:path.join(here,'qa',`key-${t.toFixed(2)}.png`),animations:'disabled'});}
    const hashes=[];
    for(const t of[7.65,2.95,14.8,7.65]){await p.evaluate(t=>window.seek(t),t);hashes.push({t,sha256:crypto.createHash('sha256').update(await p.screenshot({animations:'disabled'})).digest('hex')});}
    if(hashes[0].sha256!==hashes[3].sha256)throw new Error('Random-order seek determinism failed.');
    const hp=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
    await hp.goto(pathToFileURL(path.join(here,'hyperframes/index.html')).href,{waitUntil:'domcontentloaded',timeout:20000});await hp.evaluate(()=>window.__ready);
    await hp.evaluate(()=>window.__timelines['brandpulse-launch-15'].seek(7.65,false));
    const hfHash=crypto.createHash('sha256').update(await hp.screenshot({animations:'disabled'})).digest('hex');
    const hfDuration=await hp.evaluate(()=>window.__timelines['brandpulse-launch-15'].duration());
    if(hfHash!==hashes[0].sha256)throw new Error('Hyperframes timeline and standalone seek do not match.');
    await writeFile(path.join(here,'qa','checks.json'),JSON.stringify({reports,determinism:hashes,hyperframes:{sha256:hfHash,duration:hfDuration,pixelIdentical:true}},null,2));
    console.log(JSON.stringify({beatFrames:30,keyFrames:samples.length,deterministic:true,hyperframesPixelIdentical:true,fontLoaded:reports.every(r=>r.font),overflows:reports.flatMap(r=>r.overflow)},null,2));await hp.close();await p.close();
  }else if(mode==='render'){
    const segments=3,framesPerSegment=300;
    const started=Date.now();
    await Promise.all(Array.from({length:segments},async(_,segment)=>{
      const p=await page(),output=path.join(out,`segment-${segment}.mp4`);
      const filter="tmix=frames=3:weights='1 1 1',select='eq(mod(n,3),2)',setpts=N/(60*TB),scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p";
      const enc=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-framerate','180','-f','image2pipe','-vcodec','png','-i','pipe:0','-vf',filter,'-an','-r','60','-c:v','libx264','-preset','medium','-crf','17','-threads','2','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',output],{windowsHide:true,stdio:['pipe','ignore','pipe']});
      let err='';enc.stderr.on('data',d=>err+=d);enc.stdin.on('error',()=>{});
      const done=once(enc,'close');
      for(let local=0;local<framesPerSegment;local++){
        const frame=segment*framesPerSegment+local;
        for(let sample=0;sample<3;sample++){
          // A 180 degree shutter, with three evenly spaced temporal samples.
          const t=(frame+.5+(sample-1)*.25)/60;
          await p.evaluate(t=>window.seek(t),t);
          const bytes=await p.screenshot({type:'png',animations:'disabled'});
          await new Promise((resolve,reject)=>enc.stdin.write(bytes,error=>error?reject(new Error(err||error.message)):resolve()));
        }
        if(local%60===0)console.log(`Segment ${segment+1}/3: ${local}/${framesPerSegment} frames · ${((Date.now()-started)/1000).toFixed(0)}s elapsed`);
      }
      enc.stdin.end();const[code]=await done;await p.close();if(code!==0)throw new Error(`Encoder segment ${segment}: ${err}`);
      console.log(`Segment ${segment+1}/3 finished.`);
    }));
    const concat=path.join(out,'segments.txt');await writeFile(concat,[0,1,2].map(i=>`file 'segment-${i}.mp4'`).join('\n'));
    const final=path.join(out,'brandpulse-launch-15s-1080p60.mp4');
    await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',concat,'-i',path.join(here,'score.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','320k','-ar','48000','-t','15','-movflags','+faststart',final]);
    const probe=await run('python',[path.join(here,'probe.py'),final]);
    await writeFile(path.join(out,'metadata.json'),probe);
    console.log(`FINAL: ${final}\n${probe}`);
  }else throw new Error('Mode must be audio, qa or render.');
}finally{await browser.close();}
