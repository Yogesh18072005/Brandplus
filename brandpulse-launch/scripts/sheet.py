import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
d=Path(sys.argv[1]); step=int(sys.argv[2]); start=int(sys.argv[3]) if len(sys.argv)>3 else 0
fs=sorted(d.glob('element-*.jpeg'),key=lambda p:int(p.stem.split('-')[1]))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15); cols=6; W,Hh=320,180
for s in range(0,len(fs),36):
    ch=fs[s:s+36]; im=Image.new('RGB',(cols*W,((len(ch)+cols-1)//cols)*(Hh+20)),'#222'); dr=ImageDraw.Draw(im)
    for i,f in enumerate(ch):
        x,y=(i%cols)*W,(i//cols)*(Hh+20); im.paste(Image.open(f).resize((W,Hh)),(x,y))
        fr=start+int(f.stem.split('-')[1])*step; dr.text((x+4,y+Hh+2),f'f{fr} {fr/30:.2f}s',fill='white',font=font)
    im.save(d/f'sheet-{s//36+1}.jpg',quality=84)
print(len(fs))
