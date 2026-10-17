"""Bounded TTS requests, using isolated files and a fake voice (no corpus generation)."""
import contextlib,io,json,os,runpy,sys,tempfile,threading,types,unittest
from pathlib import Path
from unittest.mock import patch
SCRIPT=Path(__file__).resolve().parents[1]/'tts-server.py'
class TtsServerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.previous=Path.cwd();os.chdir(self.tmp.name)
  Path('public/audio').mkdir(parents=True);Path('data').mkdir()
  self.entered=threading.Event();self.release=threading.Event();self.texts=[]
  outer=self
  class Voice:
   config=types.SimpleNamespace(sample_rate=22050)
   def synthesize(self,text):
    outer.texts.append(text);outer.entered.set();outer.release.wait(3)
    yield types.SimpleNamespace(audio_int16_bytes=b'pcm')
  self.voice=Voice()
  class Encoder:
   def __getattr__(self,name):return lambda *args: None
   def encode(self,pcm):return b'mp3'
   def flush(self):return b'end'
  self.modules={'piper':types.SimpleNamespace(PiperVoice=types.SimpleNamespace(load=lambda path:self.voice)),
   'onnxruntime':types.SimpleNamespace(InferenceSession=type('Session',(),{})),
   'lameenc':types.SimpleNamespace(Encoder=Encoder),
   'bulgarian_pronunciation':types.SimpleNamespace(speech_text=lambda text,voice:text)}
  with patch.dict(sys.modules,self.modules),patch('http.server.ThreadingHTTPServer') as server,contextlib.redirect_stdout(io.StringIO()):
   self.module=runpy.run_path(str(SCRIPT))
  self.Handler=self.module['Handler']
 def tearDown(self):self.release.set();os.chdir(self.previous);self.tmp.cleanup()
 def handler(self,text):
  from urllib.parse import quote
  obj=object.__new__(self.Handler);obj.path='/api/tts?text='+quote(text);obj.connection=types.SimpleNamespace(settimeout=lambda value:None);obj.wfile=io.BytesIO();obj.status=None
  obj.send_response=lambda status:setattr(obj,'status',status);obj.send_header=lambda *args:None;obj.end_headers=lambda:None
  return obj
 def test_exact_text_is_synthesized_atomically_and_reused(self):
  self.release.set();first=self.handler('клемна кутия');first.do_GET();self.assertEqual(first.status,200)
  second=self.handler('клемна кутия');second.do_GET();self.assertEqual(second.wfile.getvalue(),b'mp3end');self.assertEqual(self.texts,['клемна кутия']);self.assertEqual(list(Path('public/audio').glob('*.tmp')),[])
 def test_queue_is_bounded_and_later_request_recovers(self):
  first=self.handler('първа фраза');thread=threading.Thread(target=first.do_GET);thread.start();self.assertTrue(self.entered.wait(1))
  # Simulate one waiting request in addition to the request currently in inference.
  slots=self.module['requests'];self.assertTrue(slots.acquire(blocking=False))
  rejected=self.handler('трета фраза');rejected.do_GET();self.assertEqual(rejected.status,503)
  slots.release();self.release.set();thread.join(2);self.assertFalse(thread.is_alive());self.assertEqual(first.status,200)
  retry=self.handler('трета фраза');retry.do_GET();self.assertEqual(retry.status,200)
if __name__=='__main__':unittest.main()
