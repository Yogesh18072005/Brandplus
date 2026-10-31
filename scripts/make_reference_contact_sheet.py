from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


source = Path(r"C:\Users\HP\Desktop\AEO ENGINE\tmp\reference-frames-20260829")
output = source / "contact-sheet.jpg"
frames = sorted(source.glob("ezgif-frame-*.jpg"))

# Twenty-four evenly spaced samples preserve the full sequence without making
# the review sheet too small to read.
sample_count = 24
indexes = [round(i * (len(frames) - 1) / (sample_count - 1)) for i in range(sample_count)]
selected = [frames[i] for i in indexes]

thumb_width, thumb_height = 250, 445
label_height = 28
columns = 6
rows = (len(selected) + columns - 1) // columns
sheet = Image.new("RGB", (columns * thumb_width, rows * (thumb_height + label_height)), "#161616")
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default()

for position, frame_path in enumerate(selected):
    image = Image.open(frame_path).convert("RGB")
    image.thumbnail((thumb_width, thumb_height), Image.Resampling.LANCZOS)
    x = (position % columns) * thumb_width + (thumb_width - image.width) // 2
    y = (position // columns) * (thumb_height + label_height)
    sheet.paste(image, (x, y))
    label = frame_path.stem.replace("ezgif-frame-", "frame ")
    draw.text((position % columns * thumb_width + 8, y + thumb_height + 6), label, fill="white", font=font)

sheet.save(output, quality=92)
print(output)
