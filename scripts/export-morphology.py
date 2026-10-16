"""Exercise bank from explicit source declension cells; no guessed endings."""
import json,re,hashlib,unicodedata,collections
from pathlib import Path
from urllib.parse import quote
out=Path('public/grammar');out.mkdir(exist_ok=True);m=json.load(open('public/content/manifest.json'));lex={}
for p in m['packages']:
 if p['kind']=='dictionary':
  for w in json.load(open('public'+p['url']))['items']:lex.setdefault((w['bg'],w['pos']),w)
pools=collections.defaultdict(list);seen=set()
labels={'feminine':'женский род','masculine':'мужской род','neuter':'средний род','plural':'множественное число','singular':'единственное число','subjective':'форма для подлежащего','objective':'форма для дополнения','definite':'определённая форма','indefinite':'неопределённая форма','count-form':'счётная форма'}
def plain(s):return unicodedata.normalize('NFC',s).replace('\u0301','')
for line in open('data/sources/bg-en-wiktionary.jsonl'):
 r=json.loads(line);w=lex.get((r['word'],r['pos']))
 if not w or r['pos'] not in ['noun','adj']:continue
 grouped=collections.defaultdict(list)
 for f in r.get('forms',[]):
  tags=set(f.get('tags',[]))
  if f.get('source')!='declension' or tags&{'vocative','archaic','obsolete','dialectal','table-tags','inflection-template'} or not re.fullmatch('[а-яА-ЯѝЍ\u0301 -]+',f['form']):continue
  if 'definite' in tags:kind='article'
  elif 'plural' in tags and r['pos']=='noun':kind='plural'
  elif r['pos']=='adj' and tags&{'feminine','neuter','plural'}:kind='agreement'
  elif 'count-form' in tags:kind='plural'
  else:continue
  key=kind+'-'+','.join(sorted(tags));grouped[key].append(plain(f['form']))
 for key,answers in grouped.items():
  identity=w['id']+'|'+key
  if identity in seen:continue
  seen.add(identity);kind=key.split('-')[0];tags=key.split('-',1)[1].split(',');description=' · '.join(labels.get(t,t) for t in tags)
  task={'id':'source-morph-'+hashlib.sha256(identity.encode()).hexdigest()[:18],'type':'article' if kind=='article' else 'spelling','prompt':f'Образуйте форму «{w["bg"]}» ({w["ru"]}): {description}.','answers':list(dict.fromkeys(answers)),'explanation':description+'. Формы взяты из исходной таблицы: '+', '.join(dict.fromkeys(answers)),'source':'https://en.wiktionary.org/wiki/'+quote(w['bg'])+'#Bulgarian','sourceLabel':'Wiktionary · CC BY-SA 4.0 · исходная таблица','skill':{'article':'Артикли','plural':'Число существительных','agreement':'Согласование прилагательных'}[kind],'level':'B1','wordId':w['id'],'common':len(w['examples'])>=5,'lemmaLength':len(w['bg'])}
  pools[kind].append(task)
catalog=[]
for kind,rows in pools.items():
 for i in range(0,len(rows),150):
  name=f'morph-{kind}-{i//150+1:03}.json';raw=json.dumps(rows[i:i+150],ensure_ascii=False,separators=(',',':')).encode();(out/name).write_bytes(raw);catalog.append({'kind':kind,'count':len(rows[i:i+150]),'url':'/grammar/'+name})
(out/'morphology-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')));Path('data/morphology-report.json').write_text(json.dumps({k:len(v) for k,v in pools.items()},indent=2));print({k:len(v) for k,v in pools.items()})
