"""Enrich context links with attested forms; retain all source attribution and IDs."""
import json,re,unicodedata,hashlib,collections
from pathlib import Path
from urllib.parse import quote
out=Path('public/content');m=json.load((out/'manifest.json').open());m['version']='0.3.0'
def norm(t):return unicodedata.normalize('NFC',t).replace('\u0301','').lower().strip()
wordfiles=[out/(p['id']+'.json') for p in m['packages'] if p['kind']=='dictionary'];words=[w for f in wordfiles for w in json.load(f.open())['items']];bybg=collections.defaultdict(list)
for w in words:bybg[norm(w['bg'])].append(w)
forms=collections.defaultdict(set)
for w in words:
 forms[norm(w['bg'])].add(w['id'])
 for f in w['forms']:
  if re.fullmatch('[а-яѝ]+',norm(f['text'])):forms[norm(f['text'])].add(w['id'])
for l in open('data/sources/bg-en-wiktionary.jsonl'):
 r=json.loads(l)
 if norm(r['word']) not in bybg:continue
 for f in r.get('forms',[]):
  if re.fullmatch('[а-яѝ]+',norm(f['form'])) and not set(f.get('tags',[]))&{'archaic','dialectal','romanization'}:
   for w in bybg[norm(r['word'])]:
    if w['pos']==r['pos']:forms[norm(f['form'])].add(w['id'])
sentencefiles=[out/(p['id']+'.json') for p in m['packages'] if p['kind']=='sentences']
sentences=[s for f in sentencefiles for s in json.load(f.open())['items']];existing={norm(s['bg']) for s in sentences};added=[]
for l in open('data/sources/bg-ru-wiktionary.jsonl'):
 r=json.loads(l)
 for sense in r.get('senses',[]):
  for ex in sense.get('examples',[]):
   bg=ex.get('text','').strip();ru=ex.get('translation','').strip()
   if not bg or not ru or norm(bg) in existing or len(bg)<8 or len(bg)>550:continue
   if re.search(r'еба|путк|педера|бляд|нахуй|сука',bg+' '+ru,re.I):continue
   sid='wikiex-'+hashlib.sha256((bg+'|'+ru).encode()).hexdigest()[:16]
   added.append({'id':sid,'bg':bg,'ru':ru,'translations':[],'author':'Авторы русского Викисловаря; цитируемый источник: '+ex.get('ref','пример статьи'),'source':'https://ru.wiktionary.org/wiki/'+quote(r['word'])+'#Болгарский','license':'CC BY-SA 4.0','review':'community','audio':None,'words':len(bg.split())})
   existing.add(norm(bg))
# Previous enrichment is safe to repeat: never duplicate an example.
sentences+=added
index=collections.defaultdict(list)
for s in sorted(sentences,key=lambda s:(abs(s['words']-9),s['id'])):
 tokens=set(re.findall('[а-яѝ]+',norm(s['bg'])));links=set()
 for t in tokens:links.update(forms.get(t,[]))
 s['lexemes']=sorted(links);s['difficulty']='Короткое предложение' if s['words']<=7 else 'Развёрнутое предложение' if s['words']<=15 else 'Сложный контекст'
 s['difficultyMethod']='Длина текста; не сертифицированный CEFR';s['grammar']='Словоформы сопоставлены по исходным парадигмам; возможна омонимия'
 for wid in links:
  if len(index[wid])<15:index[wid].append(s['id'])
for w in words:w['examples']=index.get(w['id'],[]);w['active']=len(w['examples'])>=5
# Save per original dictionary files; memory IDs never change.
lookup={w['id']:w for w in words}
for f in wordfiles:
 doc=json.load(f.open());doc['version']=m['version'];doc['items']=[lookup[w['id']] for w in doc['items']];f.write_text(json.dumps(doc,ensure_ascii=False,separators=(',',':')))
# Sentence package IDs stable for original rows; new rows appended in separate packages.
lookupS={s['id']:s for s in sentences}
for f in sentencefiles:
 doc=json.load(f.open());doc['version']=m['version'];doc['items']=[lookupS[s['id']] for s in doc['items']];f.write_text(json.dumps(doc,ensure_ascii=False,separators=(',',':')))
for i in range(0,len(added),300):
 chunk=added[i:i+300];pid=f'sentences-wiktionary-{i//300+1:03}';f=out/(pid+'.json');f.write_text(json.dumps({'schema':1,'version':m['version'],'kind':'sentences','items':chunk},ensure_ascii=False,separators=(',',':')))
 if not any(p['id']==pid for p in m['packages']):m['packages'].append({'id':pid,'kind':'sentences','title':'Контексты Викисловаря','url':'/content/'+f.name})
for p in m['packages']:
 f=out/(p['id']+'.json');raw=f.read_bytes();p.update(count=len(json.loads(raw)['items']),bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
m['counts']['sentences']=len(sentences);m['counts']['activeWords']=sum(w['active'] for w in words);m['counts']['contextLinks']=sum(len(w['examples']) for w in words)
(out/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2))
Path('data/context-report.json').write_text(json.dumps({'newSentences':len(added),'totalSentences':len(sentences),'activeWordsWith5OrMore':m['counts']['activeWords'],'contextLinks':m['counts']['contextLinks'],'limitations':'Morphological match, not semantic disambiguation; sentence difficulty is structural, not CEFR'},indent=2))
print(m['counts'],flush=True)
