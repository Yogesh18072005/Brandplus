"""V4 music bed: 120 BPM driving electronic track, synthesized in code (no samples, no licences).
Structure (beats of 0.5 s): 0-4 tension intro, 4-24 build, 22-24 riser + stop, 24 drop on "Meet BrandPulse"."""
from pathlib import Path
import json, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
SR = 48000; BPM = 120; BEAT = 60 / BPM
DUR = float(__import__('sys').argv[1]) if len(__import__('sys').argv) > 1 else 14.0
N = int(SR * DUR); rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)

def put(x, t, g=1.0, pan=0.0):
    a = int(t * SR); b = min(N, a + len(x))
    if a >= N or b <= a: return
    L[a:b] += x[:b - a] * g * np.sqrt((1 - pan) / 2) * 1.41
    R[a:b] += x[:b - a] * g * np.sqrt((1 + pan) / 2) * 1.41
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def ts(d): return np.arange(int(d * SR)) / SR

def kick():
    t = ts(0.45); f = 45 + 120 * np.exp(-t * 28)
    return np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7))
def hat(open_=False):
    t = ts(0.25 if open_ else 0.06)
    return hp(rng.normal(0, 1, len(t)), 7000) * np.exp(-t * (14 if open_ else 70))
def clap():
    t = ts(0.3); x = bp(rng.normal(0, 1, len(t)), 900, 3000)
    e = sum(np.exp(-np.maximum(0, t - d) * 60) * (t >= d) for d in (0, .011, .022)) + np.exp(-t * 12) * .5
    return x * e * .6
def saw(freq, d):
    t = ts(d); ph = (freq * t) % 1
    return 2 * ph - 1
def note(m): return 440 * 2 ** ((m - 69) / 12)

# F minor progression, one chord per 2 bars (4 beats/bar): Fm  Db  Ab  Eb
prog = [(41, [65, 68, 72]), (37, [61, 65, 68]), (44, [63, 68, 72]), (39, [63, 67, 70])]
beats = int(DUR / BEAT)
side = np.ones(N)  # sidechain envelope from the kick
for b in range(beats):
    t0 = b * BEAT
    intro = b < 4; stop = 22 <= b < 24
    bar = b // 4; root, chord = prog[(bar // 2) % 4]
    if not intro and not stop:
        put(kick(), t0, 0.9)
        a = int(t0 * SR); k = ts(0.3); side[a:a + len(k)] = np.minimum(side[a:a + len(k)], 1 - 0.75 * np.exp(-k * 9))
        put(hat(), t0 + BEAT / 2, 0.22, 0.3)
        if b % 2 == 1: put(clap(), t0, 0.5, -0.1)
        if b >= 8: put(hat(), t0 + BEAT / 4, 0.1, -0.3); put(hat(), t0 + 3 * BEAT / 4, 0.1, 0.3)
    # rolling 16th sub bass (offbeat-pumped)
    if not stop:
        for s in range(4):
            if intro and s % 2: continue
            x = lp(saw(note(root), BEAT / 4 * 0.9), 220 if intro else 420) * np.exp(-ts(BEAT / 4 * 0.9) * 8)
            put(x, t0 + s * BEAT / 4, 0.38)
    # plucked arp in 16ths, filter opens over the build
    if not intro and not stop:
        cutoff = 900 + min(1, b / 22) * 3200
        for s in range(4):
            m = chord[(b * 4 + s) % 3] + (12 if s == 3 else 0)
            d = BEAT / 4; x = (saw(note(m), d) + saw(note(m) * 1.006, d)) * 0.5
            x = lp(x, cutoff) * np.exp(-ts(d) * 18)
            put(x, t0 + s * d, 0.16, 0.35 if s % 2 else -0.35)
    # dark pad under the intro
    if intro and b % 4 == 0:
        for m in chord:
            x = lp(saw(note(m - 12), BEAT * 4), 600) * np.minimum(1, ts(BEAT * 4) / 0.4) * np.exp(-ts(BEAT * 4) * 0.4)
            put(x, t0, 0.07)

# riser into the drop at beat 24 (12 s) and a tight stop before it
rt = ts(BEAT * 4); r = hp(rng.normal(0, 1, len(rt)), 2000) * (rt / rt[-1]) ** 2.5
sweep = np.sin(2 * np.pi * np.cumsum(300 + 1800 * (rt / rt[-1]) ** 2) / SR) * (rt / rt[-1]) ** 3
put(r * 0.25 + sweep * 0.08, 20 * BEAT, 1.0)
if DUR > 12:
    t = ts(1.6); boom = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 5)) / SR) * np.exp(-t * 2.2)
    put(np.tanh(boom * 1.5), 24 * BEAT, 0.9); put(hp(rng.normal(0, 1, len(t)), 3000) * np.exp(-t * 3), 24 * BEAT, 0.15)

# glue: sidechain on everything but kick (approximation: apply to whole bus lightly), soft clip
L *= 0.55 + 0.45 * side; R *= 0.55 + 0.45 * side
mix = np.stack([L, R], 1); mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix *= 0.9 / np.abs(mix).max()
out = ROOT / 'public/v4'; out.mkdir(parents=True, exist_ok=True)
with wave.open(str(out / 'music.wav'), 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((mix * 32767).astype('<i2').tobytes())

# final mix: music ducked under VO
with wave.open(str(out / 'vo/vo.wav'), 'rb') as f:
    vo = np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').astype(np.float64) / 32768
v = np.zeros(N); v[:min(N, len(vo))] = vo[:N]
e = np.sqrt(np.convolve(v * v, np.ones(960) / 960, mode='same'))
duck = np.convolve((e > 0.01).astype(float), np.ones(4800) / 4800, mode='same')
m2 = mix * (1 - 0.45 * np.minimum(1, duck * 1.5))[:, None] * 0.55
final = m2 + v[:, None] * 0.95
final *= 0.95 / np.abs(final).max()
with wave.open(str(out / 'mix.wav'), 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((final * 32767).astype('<i2').tobytes())
print('music.wav + mix.wav', DUR, 's')
