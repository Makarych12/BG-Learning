import json,re,unicodedata
from pathlib import Path
def norm(t):return re.sub(r'[.!?…]+$','',re.sub(r'\s+',' ',unicodedata.normalize('NFC',''.join(c for c in unicodedata.normalize('NFD',unicodedata.normalize('NFC',t).replace('ѝ','\ue000')) if c not in ('\u0301','\u0300'))).replace('\ue000','ѝ')).strip()).lower()
entries=json.load(open('public/audio/ATTRIBUTION.json'));aliases={};collisions=[]
for key,item in entries.items():
 if not Path('public/audio/'+key+'.mp3').exists():continue
 aliases['='+re.sub(r'[.!?…]+$','',re.sub(r'\s+',' ',unicodedata.normalize('NFC',item['text'])).strip()).lower()]=key
 n=norm(item['text'])
 if n in aliases and aliases[n]!=key:collisions.append(n)
 else:aliases[n]=key
Path('public/audio/index.json').write_text(json.dumps(aliases,ensure_ascii=False,separators=(',',':')))
print('Audio aliases',len(aliases),'equivalent spellings',len(collisions))

# Small runtime lookups; the complete index remains an export artifact.
import runpy
runpy.run_path("scripts/shard-audio-index.py")
