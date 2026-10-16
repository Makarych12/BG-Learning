"""Append direct reverse translation entries without changing original IDs."""
import json,hashlib,re
from pathlib import Path
out=Path('public/content');m=json.load((out/'manifest.json').open());m['packages']=[p for p in m['packages'] if not p['id'].startswith('dictionary-reverse-')]
existing={x['bg'] for p in out.glob('dictionary-[0-9]*.json') for x in json.load(p.open())['items']}
rows=json.load(open('data/reverse-dictionary.json'));accepted=[]
for w in rows:
 if w['bg'] in existing:continue
 # The source does not give Bulgarian morphology here. Do not infer it from Russian.
 w['pos']='phrase' if ' ' in w['bg'] else 'unknown';w['grammar']='устойчивое сочетание · прямая переводная связь' if w['pos']=='phrase' else 'прямая переводная связь · морфология не указана'
 w['related']=[]
 # Source links for every Russian sense are preserved independently.
 accepted.append(w)
accepted.sort(key=lambda w:w['bg'].lower())
for i in range(0,len(accepted),400):
 chunk=accepted[i:i+400];pid=f'dictionary-reverse-{i//400+1:03}';payload=json.dumps({'schema':1,'version':m['version'],'kind':'dictionary','items':chunk},ensure_ascii=False,separators=(',',':')).encode();(out/(pid+'.json')).write_bytes(payload);m['packages'].append({'id':pid,'kind':'dictionary','title':chunk[0]['bg']+' — '+chunk[-1]['bg'],'count':len(chunk),'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest(),'url':'/content/'+pid+'.json'})
m['counts']['words']=sum(p['count'] for p in m['packages'] if p['kind']=='dictionary');m['counts']['directTranslationEntries']=len(accepted)
m['sources'][0]['attribution']='Авторы русского Викисловаря; извлечение Wiktextract / Kaikki, дамп 2026-10-01. Болгарские статьи и прямые болгарские переводные ссылки из русских статей. Словоформы и ударения показываются только при наличии в источнике. Независимая редактура не заявляется.'
(out/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2));print(m['counts'])
