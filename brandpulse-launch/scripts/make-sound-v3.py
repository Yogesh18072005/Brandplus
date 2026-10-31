"""V3 sound design: designed cut sounds, signature hits, one riser, sparse UI cues, ducked under VO. No music."""
from pathlib import Path
import json, re, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SR = 48000; DUR = 60; N = SR * DUR
rng = np.random.default_rng(7)

with wave.open(str(ROOT / 'public/v3/vo/vo.wav'), 'rb') as f:
    vo = np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').astype(np.float64) / 32768
v = np.zeros(N); v[:min(N, len(vo))] = vo[:N]; vo = v

# cut table straight from the film source
film = (ROOT / 'src/v3/Film.tsx').read_text(encoding='utf-8')
cuts = [(int(m.group(1)) / 30, m.group(2)) for m in re.finditer(r'to: (\d+), C: \w+, out: "(\w+)"', film)]
cuts = [c for c in cuts if c[1] != 'end']

sfx = np.zeros((N, 2)); cues = []
def add(x, t, g=1.0, pan=0.0):
    a = int(round(t * SR))
    if a < 0: x = x[-a:]; a = 0
    b = min(N, a + len(x)); x = x[:b - a] * g
    sfx[a:b, 0] += x * np.sqrt((1 - pan) / 2); sfx[a:b, 1] += x * np.sqrt((1 + pan) / 2)
def lp(x, k):  # cheap low-pass (moving average)
    return np.convolve(x, np.ones(k) / k, mode='same')
def noise(n): return rng.normal(0, 1, n)
def env(n, attack, release):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-np.maximum(0, t - attack) / release)

def whoosh(d=0.42, bright=9):
    n = int(d * SR); t = np.arange(n) / SR
    e = np.sin(np.pi * t / d) ** 3  # crest in the middle -> placed on the cut
    return lp(noise(n), bright) * e * 0.5
def sub_drop(d=0.9, f0=62, f1=31):
    n = int(d * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
def impact(d=0.35):
    n = int(d * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (140 * t + 60 * t * t)) * np.exp(-t * 18)
    snap = lp(noise(n), 3) * np.exp(-t * 60)
    return body * 0.7 + snap * 0.5
def tick(freq=1900, d=0.05):
    n = int(d * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 90) * np.minimum(1, t / 0.002)
def riser(d=1.4):
    n = int(d * SR); t = np.arange(n) / SR
    k = int(30 - 26 * 0)  # noise colour
    x = lp(noise(n), 6) * (t / d) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(200 + 700 * (t / d) ** 2) / SR) * (t / d) ** 3 * 0.25
    return (x * 0.6 + tone)
def glitch(d=0.26):
    n = int(d * SR); x = np.zeros(n)
    for s in range(0, n, int(SR * 0.018)):
        seg = min(int(SR * 0.012), n - s)
        x[s:s + seg] = np.sign(np.sin(2 * np.pi * rng.uniform(300, 2400) * np.arange(seg) / SR)) * rng.uniform(.3, .8)
    return lp(x, 4) * 0.5

# Tier B: one designed sound per cut, shaped by transition type
for i, (t, kind) in enumerate(cuts):
    pan = -0.35 if i % 2 else 0.35
    if kind == 'whip': add(whoosh(0.36, 6), t - 0.18, 0.55, pan)
    elif kind == 'zoom': add(whoosh(0.5, 14) * np.linspace(0.3, 1, int(0.5 * SR)), t - 0.38, 0.6)
    elif kind == 'blade': add(whoosh(0.26, 4), t - 0.13, 0.5, pan)
    elif kind == 'split': add(whoosh(0.3, 5), t - 0.15, 0.45, -pan)
    elif kind == 'iris': add(whoosh(0.44, 18), t - 0.22, 0.45)
    elif kind == 'match': add(impact(0.2) * 0.5, t, 0.35)
    elif kind == 'flash': add(impact(0.3), t, 0.4); add(whoosh(0.3, 3), t - 0.15, 0.3)
    elif kind == 'glitch': add(glitch(), t - 0.12, 0.55)
    cues.append({'time': round(t, 3), 'tier': 'B', 'name': f'{kind} cut'})

# Tier A: signature hits (sub drop + impact), mostly in VO gaps or on the slam word
words = json.loads((ROOT / 'src/v3/words.json').read_text())
def w(word, after=0):
    return next(x['start'] for x in words if x['start'] >= after and re.sub(r'[^a-z]', '', x['word'].lower()) == word)
signature = [
    (w('you', 6), 'you slam'), (8.55, 'zero of ten lands'), (w('meet'), 'brand reveal'),
    (w('gap'), 'gap found'), (w('ai', 16), 'AI chip'), (w('you', 28), 'instead of you'), (28.75, 'why slam'),
    (w('real', 30), 'real answers'), (w('rechecked'), 're-checked'), (w('ai', 56), 'end tagline'),
]
for t, name in signature:
    add(sub_drop(), t, 0.55); add(impact(), t, 0.32)
    cues.append({'time': round(t, 3), 'tier': 'A', 'name': name})

# one riser into the reveal (ends on "Meet")
r = riser(1.5); add(r, w('meet') - 1.5, 0.22); cues.append({'time': round(w('meet') - 1.5, 3), 'tier': 'B', 'name': 'riser into reveal'})

# Tier C: quiet UI only where the eye is
for t, name, fq in [(0.12, 'field focus', 1500), (2.17, 'answer loading', 1200), (4.98, 'not-mentioned pill', 700),
                    (12.95, 'dot pops', 2400), (14.75, 'gap found pill', 1600), (19.1, 'question pulled', 1800),
                    (22.0, 'answer captured', 2000), (34.3, 'published live', 1800), (36.45, 'named tile', 2200),
                    (52.67, 'button click', 1300), (57.3, 'CTA', 1700)]:
    add(tick(fq) + 0.5 * tick(fq * 1.5), t, 0.10, 0.15); cues.append({'time': t, 'tier': 'C', 'name': name})
# soft typing texture under the opening question (one low-passed texture, not a click per letter)
n = int(1.1 * SR); typing = np.zeros(n)
for k in range(int(1.1 * 30)):
    s = int(k / 30 * SR); m = min(int(0.02 * SR), n - s)
    typing[s:s + m] += lp(noise(m), 2) * np.exp(-np.arange(m) / SR * 200) * rng.uniform(.4, 1)
add(lp(typing, 5), 0.1, 0.12, 0.1)

# shared short room tail
for delay, g in [(.019, .2), (.037, .13), (.061, .08), (.089, .04)]:
    d = int(delay * SR); sfx[d:] += sfx[:-d] * g

# duck under VO: 6 dB while speaking, quick attack, slow release
e = np.sqrt(np.convolve(vo * vo, np.ones(960) / 960, mode='same'))
speak = (e > 0.01).astype(float)
duck = np.convolve(speak, np.ones(7200) / 7200, mode='same')
sfx *= (1 - 0.5 * np.minimum(1, duck * 1.6))[:, None]

vo_rms = np.sqrt(np.mean(vo[e > 0.01] ** 2))
sfx_rms = np.sqrt(np.mean(sfx[np.abs(sfx).max(1) > 1e-3] ** 2))
sfx *= vo_rms * 0.25 / max(sfx_rms, 1e-6)  # ~12 dB under VO on average
mix = sfx + vo[:, None] * 0.9
mix *= 0.95 / max(np.abs(mix).max(), 1e-6)

out = ROOT / 'public/v3'
with wave.open(str(out / 'mix.wav'), 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
(out / 'sound-cues.json').write_text(json.dumps(sorted(cues, key=lambda c: c['time']), indent=1))
print(f'mix.wav written · {len(cues)} cues · {len(cuts)} cuts')
