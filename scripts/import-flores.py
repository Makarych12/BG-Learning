"""Import the original unrestricted archive linked by facebookresearch/flores.
FLORES-200 license: official repository README, Licenses: CC-BY-SA 4.0.
Aligned professional human translations; not claimed as direct BG→RU translations.
"""
import tarfile,json,csv,io,hashlib,re
from pathlib import Path
out=Path('public/content');m=json.load(open(out/'manifest.json'));existing={s['bg'] for p in m['packages'] if p['kind']=='sentences' and not p['id'].startswith('sentences-flores-') for s in json.load(open('public'+p['url']))['items']};rows=[]
with tarfile.open('data/sources/flores200.tar.gz') as tar:
 for split in ['dev','devtest']:
  bg=tar.extractfile(f'./flores200_dataset/{split}/bul_Cyrl.{split}').read().decode().splitlines();ru=tar.extractfile(f'./flores200_dataset/{split}/rus_Cyrl.{split}').read().decode().splitlines();metadata=list(csv.DictReader(io.StringIO(tar.extractfile(f'./flores200_dataset/metadata_{split}.tsv').read().decode()),delimiter='\t'))
  assert len(bg)==len(ru)==len(metadata)
  for i,(b,r,meta) in enumerate(zip(bg,ru,metadata)):
   if b in existing or not b.strip() or not r.strip() or len(b)>1000:continue
   existing.add(b);rows.append({'id':f'flores200-{split}-{i+1}','bg':b,'ru':r,'translations':[{'id':i+1,'text':r,'author':'FLORES-200 / NLLB Team · профессиональные переводчики'}],'author':'FLORES-200 / NLLB Team (2022), профессиональные переводчики; исходная статья: '+meta['URL'],'source':'https://github.com/facebookresearch/flores/blob/main/flores200/README.md','license':'CC BY-SA 4.0','review':'source-human-parallel','audio':None,'words':len(b.split()),'topic':meta.get('topic'),'originalSource':meta['URL'],'translationMethod':'Совмещённые человеческие переводы одной исходной статьи'})
m['packages']=[p for p in m['packages'] if not p['id'].startswith('sentences-flores-')]
for i in range(0,len(rows),300):
 chunk=rows[i:i+300];pid=f'sentences-flores-{i//300+1:03}';raw=json.dumps({'schema':1,'version':m['version'],'kind':'sentences','items':chunk},ensure_ascii=False,separators=(',',':')).encode();(out/(pid+'.json')).write_bytes(raw);m['packages'].append({'id':pid,'kind':'sentences','title':'FLORES-200 · переводные контексты','count':len(chunk),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'url':'/content/'+pid+'.json'})
m['sources']=[s for s in m['sources'] if 'FLORES' not in s['name']]+[{'name':'FLORES-200 / NLLB Team, 2022','url':'https://github.com/facebookresearch/flores','license':'CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','attribution':'Профессиональные человеческие переводы; общая исходная статья и номер строки сохраняются. Из оригинального открытого архива FLORES-200; не FLORES+.'}];m['counts']['sentences']=sum(p['count'] for p in m['packages'] if p['kind']=='sentences');(out/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2));print('Added aligned professional contexts',len(rows))
