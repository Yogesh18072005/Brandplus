from pathlib import Path
import sys,asyncio,json,subprocess,wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parent/'.video-review-tools'))
import edge_tts
import imageio_ffmpeg
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
OUT=ROOT/'public'/'v3'/'vo';OUT.mkdir(parents=True,exist_ok=True)
SCRIPT=json.loads((ROOT/'public'/'v3'/'narration.json').read_text(encoding='utf-8'))
VOICE='en-US-AndrewMultilingualNeural'
SR=48000
async def generate(row):
    text=row['text'].replace('BrandPulse','Zero see ate')
    audio=OUT/(row['id']+'.mp3');words=[]
    if audio.exists() and (OUT/(row['id']+'.words.json')).exists():
        words=json.loads((OUT/(row['id']+'.words.json')).read_text())
    else:
        comm=edge_tts.Communicate(text,VOICE,rate='+8%',pitch='-2Hz',boundary='WordBoundary')
        with audio.open('wb') as stream:
            async for chunk in comm.stream():
                if chunk['type']=='audio':stream.write(chunk['data'])
                elif chunk['type']=='WordBoundary':words.append({'word':chunk['text'],'start':chunk['offset']/1e7,'duration':chunk['duration']/1e7})
        (OUT/(row['id']+'.words.json')).write_text(json.dumps(words,indent=2))
    pcm=subprocess.check_output([FFMPEG,'-v','error','-i',str(audio),'-f','f32le','-ac','1','-ar',str(SR),'-'])
    data=np.frombuffer(pcm,dtype='<f4').copy()
    # Trim only genuine leading/trailing silence; retain the speaker's internal pauses.
    voiced=np.where(np.abs(data)>.006)[0]
    trim=max(0,voiced[0]-int(.06*SR)) if len(voiced) else 0
    end=min(len(data),voiced[-1]+int(.15*SR)) if len(voiced) else len(data)
    data=data[trim:end]
    target=row['duration']-.25
    speed=max(1,len(data)/SR/target)
    
    if speed>1:
        raw=OUT/(row['id']+'.raw.wav')
        with wave.open(str(raw),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
        pcm=subprocess.check_output([FFMPEG,'-v','error','-i',str(raw),'-af',f'atempo={speed:.6f}','-f','f32le','-ac','1','-ar',str(SR),'-'])
        data=np.frombuffer(pcm,dtype='<f4').copy()
    peak=np.max(np.abs(data))
    data*=.84/max(.1,peak)
    aligned=[{'word':w['word'],'start':round(row['start']+.08+max(0,w['start']-trim/SR)/speed,4),'end':round(row['start']+.08+max(0,w['start']+w['duration']-trim/SR)/speed,4)} for w in words]
    print(f"{row['id']}: {len(data)/SR:.2f}s / {row['duration']}s; tempo x{speed:.3f}",flush=True)
    return row,data,aligned
async def main():
    results=[]
    for row in SCRIPT:results.append(await generate(row))
    output=np.zeros(SR*60,dtype=np.float32);all_words=[]
    for row,data,words in results:
        a=int((row['start']+.08)*SR);b=min(len(output),a+len(data));output[a:b]+=data[:b-a];all_words.extend(words)
    with wave.open(str(OUT/'vo.wav'),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(output,-1,1)*32767).astype('<i2').tobytes())
    (ROOT/'public'/'v3'/'words.json').write_text(json.dumps(all_words,indent=2))
    (ROOT/'src'/'v3'/'words.json').write_text(json.dumps(all_words,indent=2))
    print('VO master and actual word timings complete.',flush=True)
asyncio.run(main())
