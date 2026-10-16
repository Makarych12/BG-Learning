"""Add only attested Bulgarian forms/stress/relations, preserving Russian meanings and IDs."""
import json,re,unicodedata,collections,hashlib
from pathlib import Path
from urllib.parse import quote
out=Path('public/content');m=json.load(open(out/'manifest.json'));byword=collections.defaultdict(list)
for line in open('data/sources/bg-en-wiktionary.jsonl'):
 r=json.loads(line)
 if r['pos'] in ['noun','verb','adj','pron','num','adv'] and any(f.get('source') in ['conjugation','declension'] for f in r.get('forms',[])):byword[r['word']].append(r)
def norm(t):return unicodedata.normalize('NFC',t).replace('\u0301','')
labels={'singular':'единственное число','plural':'множественное число','definite':'определённая форма','indefinite':'неопределённая форма','subjective':'полная форма артикля','objective':'краткая форма артикля','masculine':'мужской род','feminine':'женский род','neuter':'средний род','vocative':'звательная форма','count-form':'счётная форма','present':'настоящее время','aorist':'аорист','imperfect':'имперфект','first-person':'1 лицо','second-person':'2 лицо','third-person':'3 лицо','indicative':'изъявительное наклонение','participle':'причастие','active':'действительное','passive':'страдательное','past':'прошедшее время','imperative':'повелительное наклонение'}
count=0;stresses=0
for package in m['packages']:
 if package['kind']!='dictionary':continue
 p=Path('public'+package['url']);doc=json.load(p.open())
 for w in doc['items']:
  matches=[r for r in byword.get(w['bg'],[]) if r['pos']==w['pos']]
  if not matches:continue
  source='https://en.wiktionary.org/wiki/'+quote(w['bg'])+'#Bulgarian';seen={f['text'] for f in w['forms']}
  for r in matches:
   for f in r.get('forms',[]):
    tags=f.get('tags',[]);text=f['form']
    if not w['stress'] and '\u0301' in text and norm(text)==w['bg']:
     w['stress']=text;stresses+=1
    if f.get('source') not in ['declension','conjugation'] or set(tags)&{'table-tags','inflection-template','archaic','obsolete','dialectal'} or not re.fullmatch('[а-яА-ЯѝЍ\u0301 -]+',text):continue
    if text not in seen:w['forms'].append({'text':text,'tags':[labels.get(t,t) for t in tags]});seen.add(text);count+=1
   for field in ['synonyms','antonyms']:
    extra=[x['word'] for x in r.get(field,[]) if re.fullmatch('[а-яА-ЯѝЍ\u0301 -]+',x.get('word',''))]
    for sense in r.get('senses',[]):extra += [x['word'] for x in sense.get(field,[]) if re.fullmatch('[а-яА-ЯѝЍ\u0301 -]+',x.get('word',''))]
    if extra:w[field]=list(dict.fromkeys(w[field]+extra));w['relationsSource']=source
  w['morphologySource']=source
 raw=json.dumps(doc,ensure_ascii=False,separators=(',',':')).encode();p.write_bytes(raw);package.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
m['counts']['stress']=sum(bool(w['stress']) for p in m['packages'] if p['kind']=='dictionary' for w in json.load(open('public'+p['url']))['items']);(out/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2));print('Added source forms',count,'source stress',stresses)
