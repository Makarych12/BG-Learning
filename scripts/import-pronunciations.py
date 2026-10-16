"""Exact stressed spelling → source IPA. Never relocate stress with homemade rules."""
import json,re,unicodedata
from pathlib import Path
from urllib.parse import quote
result={}
def key(t):return unicodedata.normalize('NFC',unicodedata.normalize('NFD',t.replace('ѝ','\ue000')).replace('\u0300','\u0301')).replace('\ue000','ѝ')
for line in open('data/sources/bg-en-wiktionary.jsonl'):
 r=json.loads(line)
 if r.get('pos') not in ['noun','verb','adj','adv','pron']:continue
 canonical=[f['form'] for f in r.get('forms',[]) if 'canonical' in f.get('tags',[]) and re.fullmatch('[а-яА-ЯѝЍ\u0301 -]+',f['form']) and '\u0301' in f['form']]
 ipa=next((s['ipa'] for s in r.get('sounds',[]) if s.get('ipa') and not set(s.get('tags',[]))&{'dialectal','archaic','obsolete'}),None)
 if not ipa or not canonical:continue
 ipa=ipa.strip('/[]').replace('.','').replace('͡','').replace('͜','')
 if 'ˈ' not in ipa:continue
 for spelling in canonical:result.setdefault(key(spelling),{'ipa':ipa,'source':'https://en.wiktionary.org/wiki/'+quote(r['word'])+'#Bulgarian','license':'CC BY-SA 4.0'})
Path('public/audio/pronunciations.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')));print('Exact source IPA spellings',len(result))
