"""Pull QA stills from the rendered MP4: every 8 frames, and every 2 frames within ±6 of each cut."""
import re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / '.video-review-tools'))
import av
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
src = ROOT / 'outputs/brandpulse-launch-v3.mp4'
out = ROOT / 'outputs/v3-final-qa'; out.mkdir(exist_ok=True)
cuts = [int(m) for m in re.findall(r'to: (\d+), C:', (ROOT / 'src/v3/Film.tsx').read_text(encoding='utf-8'))][:-1]
want = set(range(0, 1800, 8)) | {c + d for c in cuts for d in range(-6, 7, 2)}
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
frames = []
c = av.open(str(src))
for i, fr in enumerate(c.decode(video=0)):
    if i in want: frames.append((i, fr.to_image().resize((320, 180))))
W, H, cols = 320, 180, 6
for p in range(0, len(frames), 36):
    chunk = frames[p:p + 36]; rows = (len(chunk) + cols - 1) // cols
    im = Image.new('RGB', (cols * W, rows * (H + 20)), '#111'); d = ImageDraw.Draw(im)
    for k, (i, img) in enumerate(chunk):
        x, y = (k % cols) * W, (k // cols) * (H + 20)
        im.paste(img, (x, y)); d.text((x + 5, y + H + 2), f'f{i} {i/30:.2f}s{"  CUT" if i in cuts else ""}', fill='#ff6' if i in cuts else 'white', font=font)
    im.save(out / f'qa-{p // 36 + 1:02}.jpg', quality=82)
print(len(frames), 'stills,', (len(frames) + 35) // 36, 'sheets')
