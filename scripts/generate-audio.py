"""Real Bulgarian neural TTS; generated files are labelled as synthesized speech.
Voice: Piper bg_BG-dimitar-medium, source dataset CC0 (model card retained).
Run with a Python environment containing piper-tts and ffmpeg.
"""
import json,wave,time,subprocess,io,os,sys
from pathlib import Path
import lameenc
import onnxruntime as ort
from piper import PiperVoice
from bulgarian_pronunciation import speech_text
# Limit inference to avoid using every host CPU for a short utterance.
original=ort.InferenceSession
class Session(original):
 def __init__(self,path,*args,**kwargs):
  options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
  kwargs['sess_options']=options
  super().__init__(path,*args,**kwargs)
ort.InferenceSession=Session
voice=PiperVoice.load('data/voices/bg_BG-dimitar-medium.onnx')
texts=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'data/audio-texts.json'));texts.sort(key=lambda t:(0 if ' ' in t else 1,len(t)));out=Path('public/audio');out.mkdir(exist_ok=True)
def key(text):
 h=2166136261
 units=text.encode("utf-16-le")
 for i in range(0,len(units),2):h=((h^int.from_bytes(units[i:i+2],"little"))*16777619)&0xffffffff
 return f'{h:08x}'
start=time.time();done=0
for i,text in enumerate(texts):
 target=out/(key(text)+'.mp3')
 if target.exists():continue
 encoder=lameenc.Encoder();encoder.set_bit_rate(32);encoder.set_channels(1);encoder.set_in_sample_rate(22050);encoder.set_quality(7)
 pcm=b''.join(chunk.audio_int16_bytes for chunk in voice.synthesize(speech_text(text,voice)))
 target.write_bytes(encoder.encode(pcm)+encoder.flush())
 done+=1
 if done%100==0:print(f'{i+1}/{len(texts)} audio clips; {time.time()-start:.1f}s',flush=True)
(out/'LICENSE.txt').write_text('Bulgarian synthesized speech: Piper bg_BG-dimitar-medium. Source voice dataset: CC0. Model card: https://huggingface.co/rhasspy/piper-voices/blob/main/bg/bg_BG/dimitar/medium/MODEL_CARD\nText licenses: Wiktionary CC BY-SA 4.0, Tatoeba CC BY 2.0 FR; see per-item source attribution in the application. No phonetic accuracy certification.\n')
print('Complete',len(texts),time.time()-start,flush=True)
