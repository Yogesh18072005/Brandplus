from pathlib import Path
import sys, json, math
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.video-review-tools'))
import av
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs' / 'launch-reference-study'
OUT.mkdir(parents=True, exist_ok=True)
FILES = ['ki video saas type.mp4', 'Best-AI-SaaS-SnapYT.App.mp4', 'Introducing-NIVO-AI-SnapYT.App.mp4', 'Ecommerce-Product-Demo-SnapYT.App.mp4', 'Easyday (modified map version).mp4']
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
def sheet(frames, path, cols=5, width=320):
    height=round(width*9/16)
    result=Image.new('RGB',(cols*width,math.ceil(len(frames)/cols)*(height+31)), '#18202e')
    d=ImageDraw.Draw(result)
    for i,(t,img) in enumerate(frames):
        x=(i%cols)*width;y=(i//cols)*(height+31)
        result.paste(img.resize((width,height)),(x,y))
        d.text((x+9,y+height+5),f'{t:06.2f}s',fill='white',font=font)
    result.save(path,quality=88)
metadata=[]
for n,name in enumerate(FILES,1):
    path=Path('C:/Users/HP/Downloads')/name
    c=av.open(str(path));s=c.streams.video[0]
    fps=float(s.average_rate);duration=float(s.duration*s.time_base) if s.duration else c.duration/1e6
    thumbs=[];diffs=[];previous=None;next_sample=0
    for frame in c.decode(s):
        t=float(frame.time)
        small=frame.to_image().resize((160,90))
        a=np.asarray(small,dtype=np.float32)
        diff=0 if previous is None else float(np.abs(a-previous).mean())
        diffs.append({'frame':frame.pts,'t':round(t,4),'diff':round(diff,3)})
        previous=a
        if t>=next_sample:
            thumbs.append((t,frame.to_image().resize((480,270))))
            next_sample+=1.5
    for p in range(0,len(thumbs),35):
        sheet(thumbs[p:p+35],OUT/f'{n:02}-overview-{p//35+1}.jpg')
    cuts=[]
    for d in sorted(diffs,key=lambda x:x['diff'],reverse=True):
        if d['t']>0.3 and all(abs(d['t']-t)>1.2 for t in cuts):cuts.append(d['t'])
        if len(cuts)==8:break
    cuts.sort()
    c.close()
    c=av.open(str(path)); sampled=[]
    targets=[(max(0,t-0.4)+i*0.1) for t in cuts for i in range(9)]
    ti=0
    for frame in c.decode(video=0):
        t=float(frame.time)
        if ti<len(targets) and t>=targets[ti]:
            sampled.append((t,frame.to_image().resize((400,225))))
            ti+=1
    for p in range(0,len(sampled),36):sheet(sampled[p:p+36],OUT/f'{n:02}-motion-{p//36+1}.jpg',cols=6,width=300)
    info={'file':name,'fps':fps,'duration':duration,'width':s.width,'height':s.height,'decodedFrames':len(diffs),'strongMotionTimes':cuts,'audio':len(c.streams.audio)>0}
    metadata.append(info)
    (OUT/f'{n:02}-every-frame-motion.json').write_text(json.dumps(diffs))
    print(json.dumps(info),flush=True)
(OUT/'metadata.json').write_text(json.dumps(metadata,indent=2))
