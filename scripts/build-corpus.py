"""Build attributed, paginated corpus packages from downloaded open data.
Community-source review status is preserved; no fabricated CEFR or examples.
"""
import json,bz2,tarfile,re,hashlib,unicodedata,collections
from pathlib import Path
from urllib.parse import quote
root=Path('data/sources');out=Path('public/content');out.mkdir(exist_ok=True)
def plain(s):return re.sub(r'\s+',' ',re.sub('<[^>]+>','',s)).strip()
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
def detailed(name):
 result={}
 with bz2.open(root/name,'rt') as f:
  for l in f:
   parts=l.rstrip('\n').split('\t')
   if len(parts)>=4:result[int(parts[0])]={'text':parts[2],'author':parts[3] if parts[3] not in ('','\\N') else 'Tatoeba contributors (см. источник)'}
 return result
bg=detailed('bg-sentences.tsv.bz2');print('Bulgarian sentences',len(bg),flush=True)
links=collections.defaultdict(list);needed=set()
with tarfile.open(root/'links.tar.bz2','r|bz2') as tar:
 for member in tar:
  f=tar.extractfile(member)
  for l in f:
   a,b=map(int,l.split())
   if a in bg:links[a].append(b);needed.add(b)
print('Linked IDs',len(needed),flush=True)
ru={}
with bz2.open(root/'ru-sentences.tsv.bz2','rt') as f:
 for l in f:
  p=l.rstrip('\n').split('\t')
  if len(p)>=4 and int(p[0]) in needed:ru[int(p[0])]={'text':p[2],'author':p[3] if p[3] not in ('','\\N') else 'Tatoeba contributors (см. источник)'}
audio={}
with tarfile.open(root/'audio.tar.bz2','r|bz2') as tar:
 for member in tar:
  for l in tar.extractfile(member):
   p=l.decode().rstrip('\n').split('\t')
   if p and p[0].isdigit() and int(p[0]) in bg and len(p)>=4 and p[3].strip():
    audio[int(p[0])]={'author':p[2],'license':p[3],'attribution':p[4] if len(p)>4 else '', 'url':f'https://audio.tatoeba.org/sentences/bul/{p[0]}.mp3'}
sentences=[];seen=set()
for bid in sorted(bg):
 b=bg[bid];translationIds=[rid for rid in links[bid] if rid in ru]
 if not translationIds or norm(b['text']) in seen:continue
 # Keep complete direct translations, no pivot-language inference.
 variants=[{'id':rid,**ru[rid]} for rid in translationIds]
 text=b['text'];rus=variants[0]['text']
 if not (5<=len(text)<=550) or '<' in text:continue
 # Avoid known profanity and abusive examples in the default training pool.
 if re.search(r'\b(еба|педера|курв|путк|шибан|копеле|fuck|бляд|нахуй|сука)',text+' '+rus,re.I):continue
 seen.add(norm(text));sentences.append({'id':f'tatoeba-{bid}','bg':text,'ru':rus,'translations':variants,'author':b['author'],'source':f'https://tatoeba.org/en/sentences/show/{bid}','license':'CC BY 2.0 FR','review':'community','audio':audio.get(bid),'words':len(text.split())})
print('Direct BG-RU pairs',len(sentences),'audio with license',sum(bool(s['audio']) for s in sentences),flush=True)
# Attach contextual examples by exact lemma token only, never guess an inflection.
exampleIndex=collections.defaultdict(list)
for s in sorted(sentences,key=lambda s:abs(s['words']-9)):
 for token in set(re.findall(r'[а-яѝ]+',norm(s['bg']))):
  if len(exampleIndex[token])<4:exampleIndex[token].append(s['id'])
pos={'noun':'существительное','verb':'глагол','adj':'прилагательное','adv':'наречие','pron':'местоимение','prep':'предлог','conj':'союз','particle':'частица','num':'числительное','phrase':'выражение','intj':'междометие','abbrev':'сокращение'}
tag={'masculine':'мужской род','feminine':'женский род','neuter':'средний род','imperfective':'несовершенный вид','perfective':'совершенный вид','plural':'множественное число','singular':'единственное число','definite':'определённая форма','indefinite':'неопределённая форма','count-form':'счётная форма','first-person':'1 лицо','second-person':'2 лицо','third-person':'3 лицо','present':'настоящее время','past':'прошедшее время','imperative':'повелительное наклонение'}
words=[];rejected=collections.Counter()
for line in (root/'bg-ru-wiktionary.jsonl').open():
 r=json.loads(line);lemma=r['word'];senses=[]
 if r['pos'] not in pos:rejected['affix-or-unknown']+=1;continue
 if not re.fullmatch(r'[А-Яа-яѝЍ\s\-–(),]+',lemma):rejected['non-cyrillic']+=1;continue
 for s in r.get('senses',[]):
  if 'form-of' in s.get('tags',[]) or 'no-gloss' in s.get('tags',[]):continue
  gloss=[plain(g) for g in s.get('glosses',[]) if g and not re.search(r'отсутствует пример|значение не указано|морфологич|форма .*?(падеж|лица|числа)|нужен перевод',g,re.I)]
  if gloss:senses.append({'gloss':'; '.join(gloss),'tags':s.get('raw_tags',[])+s.get('tags',[])})
 if not senses:rejected['no-lexical-definition']+=1;continue
 stress=next((x['form'] for x in r.get('forms',[]) if 'stressed' in x.get('tags',[]) and norm(x['form'])==norm(lemma)),None)
 if not stress:
  hyp=''.join(r.get('hyphenations',[{}])[0].get('parts',[]))
  if norm(hyp)==norm(lemma) and any(c in hyp for c in ['\u0301','\u0300']):stress=hyp
 forms=[{'text':f['form'],'tags':[tag.get(t,t) for t in f.get('tags',[])]} for f in r.get('forms',[]) if 'stressed' not in f.get('tags',[])][:120]
 cats=[c['name'].replace('/bg','') for c in r.get('categories',[]) if '/bg' in c.get('name','') and not re.search('род/|букв|происхожд|падеж',c.get('name',''))][:8]
 wid='wiki-'+hashlib.sha256((lemma+'|'+r['pos']+'|'+senses[0]['gloss']).encode()).hexdigest()[:16]
 words.append({'id':wid,'bg':lemma,'stress':stress,'ru':senses[0]['gloss'],'senses':senses,'pos':r['pos'],'grammar':' · '.join([pos[r['pos']]]+[tag[t] for t in r.get('tags',[]) if t in tag]),'forms':forms,'synonyms':list(dict.fromkeys(x['word'] for x in r.get('synonyms',[])))[:12],'antonyms':list(dict.fromkeys(x['word'] for x in r.get('antonyms',[])))[:12],'related':list(dict.fromkeys(x['word'] for x in r.get('related',[])+r.get('derived',[])))[:16],'ipa':list(dict.fromkeys(x['ipa'] for x in r.get('sounds',[]) if x.get('ipa'))),'categories':cats,'examples':exampleIndex.get(norm(lemma),[]),'source':'https://ru.wiktionary.org/wiki/'+quote(lemma)+'#Болгарский','license':'CC BY-SA 4.0','review':'community'})
words.sort(key=lambda w:(norm(w['bg']),w['pos']))
packages=[]
def writePackages(kind,rows,size):
 for i in range(0,len(rows),size):
  chunk=rows[i:i+size];pid=f'{kind}-{i//size+1:03}';payload=json.dumps({'schema':1,'version':'0.2.0','kind':kind,'items':chunk},ensure_ascii=False,separators=(',',':')).encode();path=out/(pid+'.json');path.write_bytes(payload)
  packages.append({'id':pid,'kind':kind,'title':f'{chunk[0]["bg"][:25]} — {chunk[-1]["bg"][:25]}' if kind=='dictionary' else f'Контексты {i+1}–{i+len(chunk)}','count':len(chunk),'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest(),'url':'/content/'+path.name})
writePackages('dictionary',words,400);writePackages('sentences',sentences,300)
manifest={'schema':1,'version':'0.2.0','builtAt':'2026-10-16','counts':{'words':len(words),'sentences':len(sentences),'licensedAudio':sum(bool(s['audio']) for s in sentences),'stress':sum(bool(w['stress']) for w in words)},'packages':packages,'sources':[{'name':'Русский Викисловарь / Kaikki','url':'https://kaikki.org/ruwiktionary/Болгарский/','license':'CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','attribution':'Авторы статей русского Викисловаря; извлечение Wiktextract / Kaikki; дамп 2026-10-01. Значения, словоформы и связи отобраны программно, независимая редактура не заявляется.'},{'name':'Tatoeba','url':'https://tatoeba.org/en/downloads','license':'CC BY 2.0 FR','licenseUrl':'https://creativecommons.org/licenses/by/2.0/fr/','attribution':'Авторы болгарских и русских предложений указаны у каждого примера. Только прямые переводные связи, без перевода через промежуточный язык.'}]}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
Path('data/import-report.json').write_text(json.dumps({'counts':manifest['counts'],'rejected':rejected,'sentenceUsers':len(set(s['author'] for s in sentences))},ensure_ascii=False,indent=2))
print(json.dumps(manifest['counts'],ensure_ascii=False),rejected,flush=True)
