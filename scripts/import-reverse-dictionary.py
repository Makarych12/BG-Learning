"""Import explicit Bulgarian translation links from Russian Wiktionary.
No pivot translation or machine-generated definition; lexical source is retained.
"""
import requests,json,re,hashlib,unicodedata,collections
from pathlib import Path
from urllib.parse import quote
url='https://kaikki.org/ruwiktionary/Русский/kaikki.org-dictionary-Русский.jsonl'
existing={x['bg'] for p in Path('public/content').glob('dictionary-[0-9]*.json') for x in json.load(p.open())['items']}
found={};checked=0
with requests.get(url,stream=True,timeout=120) as r:
 r.raise_for_status()
 for line in r.iter_lines(chunk_size=1024*1024):
  if not line:continue
  row=json.loads(line);checked+=1
  if not row.get('translations'):continue
  for t in row['translations']:
   word=t.get('word','').strip();meaning=row.get('word','')
   if (t.get('code') or t.get('lang_code'))!='bg' or not re.fullmatch('[а-яѝА-ЯЍ -]+',word) or word in existing:continue
   if len(word)>80 or len(meaning)>100:continue
   senses=t.get('sense','');key=word
   entry=found.setdefault(key,{'id':'wiki-reverse-'+hashlib.sha256(word.encode()).hexdigest()[:16],'bg':word,'stress':None,'ru':meaning,'senses':[],'pos':'phrase' if ' ' in word else 'unknown','grammar':'переводная словарная связь','forms':[],'synonyms':[],'antonyms':[],'related':[],'ipa':[],'categories':[],'examples':[],'source':'https://ru.wiktionary.org/wiki/'+quote(meaning)+'#Русский','license':'CC BY-SA 4.0','review':'community-direct-translation'})
   gloss=meaning+(' — '+senses if senses else '')
   if not any(s['gloss']==gloss for s in entry['senses']):entry['senses'].append({'gloss':gloss,'tags':['Прямая переводная ссылка из русской статьи'],'source':'https://ru.wiktionary.org/wiki/'+quote(meaning)+'#Русский'})
   entry['ru']='; '.join(s['gloss'] for s in entry['senses'])
   if t.get('roman'):entry['related'].append(t['roman'])
print('Russian entries processed',checked,'additional Bulgarian entries',len(found),flush=True)
Path('data/reverse-dictionary.json').write_text(json.dumps(list(found.values()),ensure_ascii=False))
