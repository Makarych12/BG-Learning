"""Local Bulgarian TTS backend. Loopback only; bounded requests and atomic cache writes."""
import io,json,threading,os,re
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs
import lameenc,onnxruntime as ort
from piper import PiperVoice
from bulgarian_pronunciation import speech_text
original=ort.InferenceSession
class Session(original):
 def __init__(self,path,*args,**kwargs):
  options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1;kwargs['sess_options']=options;super().__init__(path,*args,**kwargs)
ort.InferenceSession=Session
voice=PiperVoice.load('data/voices/bg_BG-dimitar-medium.onnx');lock=threading.Lock()
def key(text):
 h=2166136261
 units=text.encode('utf-16-le')
 for i in range(0,len(units),2):h=((h^int.from_bytes(units[i:i+2],'little'))*16777619)&0xffffffff
 return f'{h:08x}'
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  request=urlparse(self.path)
  if request.path=='/api/tts/health':self.send_response(200);self.end_headers();self.wfile.write(b'Bulgarian Piper ready');return
  text=parse_qs(request.query).get('text',[''])[0].strip()
  if request.path!='/api/tts' or not 1<=len(text)<=1000 or not re.search('[а-яА-Я]',text):self.send_error(400);return
  try:
   target=Path('public/audio')/(key(text)+'.mp3')
   with lock:
    if not target.exists():
     encoder=lameenc.Encoder();encoder.set_bit_rate(32);encoder.set_channels(1);encoder.set_in_sample_rate(22050);encoder.set_quality(7)
     pcm=b''.join(chunk.audio_int16_bytes for chunk in voice.synthesize(speech_text(text,voice)))
     temp=target.with_suffix('.tmp');temp.write_bytes(encoder.encode(pcm)+encoder.flush());temp.replace(target)
     with Path('data/generated-audio.jsonl').open('a') as log:log.write(json.dumps({'key':key(text),'text':text,'voice':'Piper bg_BG-dimitar-medium','synthetic':True},ensure_ascii=False)+'\n')
   data=target.read_bytes();self.send_response(200);self.send_header('Content-Type','audio/mpeg');self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','public, max-age=31536000, immutable');self.end_headers();self.wfile.write(data)
  except BrokenPipeError:pass
  except Exception as e:print(type(e).__name__,flush=True);self.send_error(503,'Bulgarian speech unavailable')
 def log_message(self,*args):pass
print('Bulgarian Piper on 127.0.0.1:8791',flush=True)
ThreadingHTTPServer(('127.0.0.1',8791),Handler).serve_forever()
