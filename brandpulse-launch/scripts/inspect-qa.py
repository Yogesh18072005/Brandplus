from pathlib import Path
import json,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
audit='--audit' in __import__('sys').argv
OUT=ROOT/'outputs'/('qa-frames' if audit else 'hero-frames')
cfg=json.loads((OUT/'sampling.json').read_text())
files=sorted(OUT.glob('frame-*.jpg'));font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
size=(384,216) if audit else (640,360);cols=5 if audit else 3;batch=40 if audit else 12
for n in range(0,len(files),batch):
 page=files[n:n+batch];w,h=size;canvas=Image.new('RGB',(cols*w,math.ceil(len(page)/cols)*(h+28)),'#111D30');d=ImageDraw.Draw(canvas)
 for i,path in enumerate(page):
  f=int(path.stem.split('-')[-1]);x=(i%cols)*w;y=(i//cols)*(h+28)
  canvas.paste(Image.open(path).resize(size),(x,y));d.text((x+9,y+h+4),f'f{f:04}  {f/30:05.2f}s',font=font,fill='white')
 canvas.save(OUT/f'contact-{n//batch+1:02}.jpg',quality=88)
handoffs=[]
for cut in cfg['cuts']:
 a=OUT/f'frame-{cut-1:04}.jpg';b=OUT/f'frame-{cut:04}.jpg'
 if a.exists() and b.exists():
  x=np.asarray(Image.open(a),dtype=float);y=np.asarray(Image.open(b),dtype=float)
  handoffs.append({'cut':cut,'meanAbsoluteDifference':float(np.abs(x-y).mean()),'identical':bool(np.array_equal(x,y))})
motion=[]
for a,b in zip(files,files[1:]):
 fa=int(a.stem.split('-')[-1]);fb=int(b.stem.split('-')[-1])
 if fb-fa==8:
  x=np.asarray(Image.open(a).resize((160,90)),dtype=float);y=np.asarray(Image.open(b).resize((160,90)),dtype=float)
  motion.append({'start':fa,'end':fb,'difference':float(np.abs(x-y).mean())})
report={'framesRendered':len(files),'pages':math.ceil(len(files)/batch),'handoffs':handoffs,'staticSamples':[x for x in motion if x['difference']<.06]}
(OUT/'qa-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'frames':len(files),'pages':report['pages'],'identicalHandoffs':sum(x['identical'] for x in handoffs),'handoffs':len(handoffs),'staticSamples':report['staticSamples']},indent=2))
