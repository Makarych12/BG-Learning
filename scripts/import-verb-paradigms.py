"""Keep complete attested finite paradigms only. Never infer a stem or participle."""
import json,re,unicodedata,collections
from pathlib import Path
from urllib.parse import quote
def norm(t):return unicodedata.normalize('NFC',t).replace('\u0301','').strip()
ru={}
for file in Path('public/content').glob('dictionary-*.json'):
 for w in json.loads(file.read_text())['items']:
  if w['pos'] in ('verb','unknown') or w['bg'].endswith((' се',' си')):ru.setdefault(w['bg'],w['ru'])
verbs=[];allverbs=[];skipped=collections.Counter();seen=set()
for line in open('data/sources/bg-en-wiktionary.jsonl'):
 r=json.loads(line)
 if r['pos']!='verb' or len(r.get('forms',[]))<30 or r['word'] in seen:continue
 bg=r['word']
 if re.search(r'еба|шибам',bg):continue
 if not re.fullmatch('[а-яѝ -]+',bg):continue
 senses=[sense for sense in r.get('senses',[]) if not set(sense.get('tags',[])) & {'form-of','archaic','obsolete','vulgar'}]
 gloss=next((g for sense in senses for g in sense.get('glosses',[]) if g),None)
 if not gloss or re.search(r'fuck|cunt|shit',gloss,re.I):continue
 forms=r['forms']
 def pick(tags):
  candidates=[norm(f['form']) for f in forms if set(tags)<=set(f.get('tags',[])) and not set(f.get('tags',[]))&{'archaic','dialectal','rare','dated'} and re.fullmatch(r'[А-Яа-яѝЍ\u0301\s-]+',f['form'])]
  return candidates[0] if candidates else None
 tables={}
 for tense in ['present','aorist','imperfect']:
  tables[tense]=[pick(['indicative',tense,person,number]) for number in ['singular','plural'] for person in ['first-person','second-person','third-person']]
 parts={gender:pick(['active','aorist','indefinite','participle','past',gender]) for gender in ['masculine','feminine','neuter','plural']}
 if any(not x for table in tables.values() for x in table) or not all(parts.values()):skipped['incomplete-source']+=1;continue
 aspect='perfective' if any('perfective' in f.get('tags',[]) and 'canonical' in f.get('tags',[]) for f in forms) else 'imperfective' if any('imperfective' in f.get('tags',[]) and 'canonical' in f.get('tags',[]) for f in forms) else 'source-unspecified'
 pairs=[norm(f['form']) for f in forms if ('perfective' in f.get('tags',[]) or 'imperfective' in f.get('tags',[])) and 'canonical' not in f.get('tags',[]) and re.fullmatch('[а-яѝ\u0301 -]+',f['form'])]
 item={'bg':bg,'ru':ru.get(bg,'[EN] '+gloss),**tables,'participle':parts['masculine'],'plural':parts['plural'],'participles':parts,'aspect':aspect,'pairs':pairs,'source':'https://en.wiktionary.org/wiki/'+quote(bg)+'#Bulgarian','license':'CC BY-SA 4.0','review':'community-source-complete','reflexive':bg.endswith((' се',' си'))}
 item['imperative']=[pick(['imperative',number]) for number in ['singular','plural']]
 item['presentParticiple']={gender:pick(['active','present','indefinite','participle',gender]) for gender in ['masculine','feminine','neuter','plural']}
 allverbs.append(item)
 if bg in ru:verbs.append(item)
 seen.add(bg)
verbs.sort(key=lambda v:(v['bg'] not in ['чета','пиша','говоря','работя','проверявам'],v['bg']))
allverbs.sort(key=lambda v:(v['bg'] not in ru,v['bg']))
out=Path('public/grammar');out.mkdir(exist_ok=True)
catalog=[]
for i in range(0,len(allverbs),100):
 name=f'verbs-{i//100+1:03}.json';chunk=allverbs[i:i+100];(out/name).write_text(json.dumps(chunk,ensure_ascii=False,separators=(',',':')))
 for v in chunk:catalog.append({'bg':v['bg'],'ru':v['ru'],'url':'/grammar/'+name})
(out/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')))
Path('src/verb-paradigms.json').write_text(json.dumps(verbs,ensure_ascii=False,separators=(',',':')))
Path('data/verb-import-report.json').write_text(json.dumps({'complete':len(allverbs),'russianLinked':len(verbs),'skipped':skipped,'source':'https://kaikki.org/dictionary/Bulgarian/','license':'CC BY-SA 4.0'},ensure_ascii=False,indent=2))
print('Complete paradigms',len(allverbs),'Russian linked',len(verbs),skipped)
