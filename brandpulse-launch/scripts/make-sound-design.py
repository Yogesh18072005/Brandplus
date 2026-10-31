from pathlib import Path
import json,wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1];SR=48000
OUT=ROOT/'public'/'audio';OUT.mkdir(exist_ok=True,parents=True)
with wave.open(str(ROOT/'public'/'voiceover'/'brandpulse-vo.wav'),'rb') as f:vo=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(np.float64)/32768
v=np.zeros(SR*60);v[:min(len(v),len(vo))]=vo[:len(v)];vo=v
sfx=np.zeros((SR*60,2),dtype=np.float64);rng=np.random.default_rng(19300)
cues=[]
cut_times=[1.5,3,4.5,6,7.5,9,10.5,12,13.5,15,16,17.5,19,20.5,21.5,23,24.5,26,27,28.5,30,31.5,32.5,34,35.5,37,38,39.5,41,42.5,44,45.5,47,48.5,50,51.5,53,54.5,56,57.5,59]
signature={6,12,16,27,32.5,38,44,50,56}
def add(data,start,gain=1,pan=0):
 a=round(start*SR)
 if a<0:data=data[-a:];a=0
 b=min(len(sfx),a+len(data));data=data[:b-a]*gain
 sfx[a:b,0]+=data*np.sqrt((1-pan)/2);sfx[a:b,1]+=data*np.sqrt((1+pan)/2)
def filtered_noise(n):
 raw=rng.normal(0,1,n)
 return np.convolve(raw,np.ones(43)/43,mode='same')
for i,cut in enumerate(cut_times):
 dur=.24;n=int(SR*dur);t=np.arange(n)/SR
 # One designed movement sound: low-passed noise crest exactly on the cut.
 env=np.sin(np.pi*np.minimum(t/dur,1))**2
 sound=filtered_noise(n)*env*.075
 add(sound,cut-dur/2,pan=(-.25 if i%2 else .25))
 if cut in signature:
  t=np.arange(int(SR*.42))/SR
  sub=np.sin(2*np.pi*(37*t+1.9*(1-np.exp(-t*20))))*np.exp(-t*10)
  hit=np.sin(2*np.pi*(280*t+200*t*t))*np.exp(-t*35)
  add(sub,cut,.11);add(hit,cut,.035)
 cues.append({'time':cut,'tier':'A+B' if cut in signature else 'B','name':'signature impact + cut' if cut in signature else 'camera move','crest':cut})
for cut in [30.7,34.7,40.2,46.2,52.2,55.2]:
 t=np.arange(int(SR*.09))/SR
 click=(np.sin(2*np.pi*740*t)+.4*np.sin(2*np.pi*1110*t))*np.exp(-t*65)*np.minimum(t/.003,1)
 add(click,cut,.018,pan=.1);cues.append({'time':cut,'tier':'C','name':'focused UI confirmation'})
# Single, shared short-room tail. No long echoes or continuous music bed.
for delay,gain in [(.023,.18),(.041,.12),(.067,.07)]:
 n=int(delay*SR);sfx[n:]+=sfx[:-n]*gain
# Voice-aware 7 dB ducking with a short attack and relaxed release.
energy=np.sqrt(np.convolve(vo*vo,np.ones(1200)/1200,mode='same'))
spoken=(energy>.009).astype(float)
envelope=np.convolve(spoken,np.ones(4800)/4800,mode='same')
sfx*= (1-.55*np.minimum(envelope,1))[:,None]
vo_rms=np.sqrt(np.mean(vo[energy>.009]**2))
sfx_rms=np.sqrt(np.mean(sfx[np.any(np.abs(sfx)>.001,axis=1)]**2))
sfx*=min(2.8,vo_rms*.24/max(sfx_rms,.00001))
master=sfx+vo[:,None]*.86
peak=np.max(np.abs(master));master*=min(1,.94/max(peak,.001))
for name,data in [('brandpulse-sfx.wav',sfx),('brandpulse-final-mix.wav',master)]:
 with wave.open(str(OUT/name),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
metadata={'duration':60,'sampleRate':SR,'music':False,'voiceRms':float(vo_rms),'sfxRms':float(np.sqrt(np.mean(sfx**2))),'peak':float(np.max(np.abs(master))),'duckDb':7,'cues':sorted(cues,key=lambda c:c['time'])}
(OUT/'sound-design.json').write_text(json.dumps(metadata,indent=2))
print(f"60s VO + designed SFX master; no music; {len(cues)} cues; peak={metadata['peak']:.3f}")
