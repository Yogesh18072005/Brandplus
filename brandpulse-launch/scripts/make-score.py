from pathlib import Path
import numpy as np
import wave

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public'/'audio';OUT.mkdir(exist_ok=True,parents=True)
SR=44100;DURATION=56
audio=np.zeros((SR*DURATION,2),dtype=np.float64)
rng=np.random.default_rng(240619)
def add(sound,start,gain=1,pan=0):
    a=int(start*SR);b=min(len(audio),a+len(sound))
    if b<=a:return
    sound=sound[:b-a]*gain
    audio[a:b,0]+=sound*np.sqrt((1-pan)/2)
    audio[a:b,1]+=sound*np.sqrt((1+pan)/2)
def tone(freq,duration,decay=3):
    t=np.arange(int(SR*duration))/SR
    attack=np.minimum(t/.012,1)
    envelope=attack*np.exp(-t*decay)*np.minimum((duration-t)/.05,1)
    return (np.sin(2*np.pi*freq*t)+.21*np.sin(2*np.pi*freq*2*t)+.08*np.sin(2*np.pi*freq*3*t))*envelope
def note(n):return 440*2**((n-69)/12)
# Original 120 BPM F-minor score. No sampled or extracted reference audio.
chords=[[53,56,60,67],[49,53,56,63],[56,60,63,70],[51,55,58,65]]
for bar in range(28):
    start=bar*2;chord=chords[(bar//2)%4]
    if start>=52:chord=[53,56,60,65]
    for n in chord:
        add(tone(note(n),2.5,1.0),start,.031,(-.35 if n%2 else .35))
    for step in range(8):
        pos=start+step*.25
        if pos>=53:continue
        n=chord[[0,2,1,3,0,2,3,1][step]]+12
        add(tone(note(n),.5,8),pos,.065 if pos>=14 else .04,(step%3-1)*.35)
    for beat in range(4):
        pos=start+beat*.5
        if pos>=52.5:continue
        if 6<=pos<10 and beat%2:continue
        t=np.arange(int(SR*.34))/SR
        kick=np.sin(2*np.pi*(47*t+5*(1-np.exp(-t*28))))*np.exp(-t*17)
        add(kick,pos,.28 if start>=14 else .17)
        add(tone(note(chord[0]-24),.42,6),pos,.11)
        if beat%2 and pos>=10:
            t=np.arange(int(SR*.16))/SR
            noise=rng.standard_normal(len(t));noise=np.r_[0,np.diff(noise)]
            add(noise*np.exp(-t*34),pos,.032)
    if 14<=start<50:
        for step in range(8):
            t=np.arange(int(SR*.055))/SR
            noise=rng.standard_normal(len(t));noise=np.r_[0,np.diff(noise)]
            add(noise*np.exp(-t*90),start+.125+step*.25,.009 if step%2 else .013,(-1 if step%2 else 1)*.45)
# Designed accent sweeps at camera transitions, all seeded and deterministic.
for at in [2.5,5.6,9.35,12.9,20.15,27.2,34.15,41.1,47.1]:
    t=np.arange(int(SR*.85))/SR
    env=np.sin(np.pi*np.minimum(t/.85,1))**2
    noise=rng.standard_normal(len(t))
    smooth=np.convolve(noise,np.ones(14)/14,mode='same')
    sweep=np.sin(2*np.pi*(230*t+1300*t*t))*env*.012+smooth*env*.065
    add(sweep,at,.5)
for at in [4.6,10.6,16,18,23.7,25.2,32.65,39.6,48.5,50.2]:
    add(tone(1046.5,.14,30),at,.04)
add(tone(note(77),3,1.3),52,.065)
for delay,gain in [(0.23,.19),(.46,.09)]:
    n=int(delay*SR);audio[n:]+=audio[:-n]*gain
fade=np.minimum(np.arange(len(audio))/SR/1.2,1)*np.minimum((len(audio)-np.arange(len(audio)))/SR/2.8,1)
audio*=fade[:,None]
audio=np.tanh(audio*1.35)
peak=np.max(np.abs(audio));audio*=.78/max(peak,.01)
pcm=(audio*32767).astype('<i2')
with wave.open(str(OUT/'brandpulse-score.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes(pcm.tobytes())
print(f'Original score: {DURATION}s, stereo 44.1kHz, 120 BPM, peak {np.max(np.abs(audio)):.3f}')
