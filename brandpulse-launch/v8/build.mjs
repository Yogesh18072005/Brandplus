import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const template = await readFile(path.join(here, 'film.html'), 'utf8');
const font = await readFile(path.resolve(project, '../app/fonts/InterVariable.woff2'));
const gsap = await readFile(path.join(project, 'node_modules/gsap/dist/gsap.min.js'), 'utf8');
const scoreCode = await readFile(path.join(here, 'score.js'), 'utf8');
let audio = '';
try { audio = 'data:audio/wav;base64,' + (await readFile(path.join(here, 'score.wav'))).toString('base64'); } catch {}
const core = template.replace('__INTER_FONT__', font.toString('base64')).replace('__SCORE_SOURCE__', scoreCode);
// The deliverable is genuinely standalone; no GSAP ticker or vendor clock is needed.
const html = core.replace('<script>__GSAP_SOURCE__</script>', '').replace('__AUDIO_SOURCE__', audio);
await mkdir(path.join(project, 'public/launch15'), {recursive:true});
await writeFile(path.join(here, 'index.html'), html);
await writeFile(path.join(project, 'public/launch15/index.html'), html);
try { await writeFile(path.join(project, 'public/launch15/score.wav'), await readFile(path.join(here, 'score.wav'))); } catch {}
// Hyperframes uses an authentic paused GSAP timeline and external audio, as its
// runtime requires. It drives the exact same seek function and measured layers.
const hf = path.join(here, 'hyperframes');
await mkdir(hf, {recursive:true});
await writeFile(path.join(hf,'index.html'),core.replace('<script>__GSAP_SOURCE__</script>','<script src="./gsap.min.js"></script>').replace('__AUDIO_SOURCE__','./score.wav'));
await writeFile(path.join(hf,'gsap.min.js'),gsap);
try { await writeFile(path.join(hf,'score.wav'),await readFile(path.join(here,'score.wav'))); } catch {}
console.log(`Built standalone HTML: ${html.length.toLocaleString()} characters; embedded Inter, vector UI${audio ? ', original WAV' : ''}. Hyperframes companion uses the same composition.`);
