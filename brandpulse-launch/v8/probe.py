"""Inspect and fully decode the final film with the existing PyAV runtime."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / '.video-review-tools'))
import av

target = Path(sys.argv[1]).resolve()
with av.open(str(target)) as container:
    streams = []
    for stream in container.streams:
        item = {'type': stream.type, 'codec': stream.codec_context.name}
        if stream.type == 'video':
            item.update(width=stream.width, height=stream.height,
                        fps=str(stream.average_rate), frames=stream.frames,
                        pixel_format=stream.codec_context.format.name)
        if stream.type == 'audio':
            item.update(sample_rate=stream.rate, channels=stream.codec_context.channels)
        streams.append(item)
    duration = container.duration / av.time_base
    decoded = sum(1 for _ in container.decode(video=0))

assert decoded == 900, f'Expected 900 frames, found {decoded}'
assert abs(duration - 15) < .05, f'Unexpected duration: {duration}'
assert any(s['type'] == 'video' and s['width'] == 1920 and s['height'] == 1080 and s['fps'] == '60' for s in streams)
assert any(s['type'] == 'audio' and s['sample_rate'] == 48000 and s['channels'] == 2 for s in streams)
print(json.dumps({'file': str(target), 'duration': duration, 'decoded_frames': decoded,
                  'bytes': target.stat().st_size, 'streams': streams}, indent=2))
