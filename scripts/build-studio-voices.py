"""Pinned local Piper model; synthesize once, encode full sentences without clipping."""
from pathlib import Path
import json,wave,subprocess,hashlib,os
os.environ['ORT_DISABLE_TELEMETRY']='1'
from piper import PiperVoice,SynthesisConfig
root=Path('.sites-runtime/tts');voice=PiperVoice.load(root/'vi_VN-vais1000-medium.onnx');voice.session.disable_fallback()
clips=[]
for line in json.loads((root/'lines.json').read_text()):
 wav=root/(line['id']+'.wav')
 with wave.open(str(wav),'wb') as f:voice.synthesize_wav(line['text'],f,SynthesisConfig(length_scale=.91,noise_scale=.5,noise_w_scale=.65))
 with wave.open(str(wav),'rb') as f:duration=f.getnframes()/f.getframerate()
 window=line['until']-line['at'];rate=max(1,duration/(window-.15))
 if rate>1.35:raise ValueError(f'Speech needs a longer caption window: {line["id"]}, {duration:.2f}s, rate {rate:.2f}')
 out=Path('public'+line['url'])
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-af',f'atempo={rate},afade=t=in:st=0:d=0.015,alimiter=limit=0.85','-c:a','libvorbis','-q:a','3',str(out)],check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_format','-of','json',str(out)]));actual=float(probe['format']['duration'])
 assert actual<=window+.02
 clips.append({**line,'duration':actual,'tempo':rate,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()});print(line['id'],round(actual,2),flush=True)
(root/'rendered.json').write_text(json.dumps(clips,ensure_ascii=False))
