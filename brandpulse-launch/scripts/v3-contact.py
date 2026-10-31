import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
d=Path(sys.argv[1]);files=sorted(d.glob('element-*.jpeg'))+sorted(d.glob('*.jpeg'))
files=sorted(set(files))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
W,H=384,216;cols=5
for p in range(0,len(files),25):
    chunk=files[p:p+25];rows=(len(chunk)+cols-1)//cols
    im=Image.new('RGB',(cols*W,rows*(H+24)),'#111')
    dr=ImageDraw.Draw(im)
    for i,f in enumerate(chunk):
        x=(i%cols)*W;y=(i//cols)*(H+24)
        im.paste(Image.open(f).resize((W,H)),(x,y))
        n=int(''.join(c for c in f.stem if c.isdigit()))
        dr.text((x+6,y+H+3),f'f{n} {n/30:.2f}s',fill='white',font=font)
    im.save(d/f'contact-{p//25+1:02}.jpg',quality=85)
