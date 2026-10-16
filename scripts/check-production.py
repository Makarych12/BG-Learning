"""HTTP contract verification; does not claim browser rendering or ASR validation."""
import requests,json,hashlib,re,concurrent.futures
from pathlib import Path
base='http://127.0.0.1:4173';m=json.load(open('public/content/manifest.json'));photos=json.load(open('src/photos.json'));alias=json.load(open('public/audio/index.json'))
checks=[(p['url'],p['sha256']) for p in m['packages']]
checks += [('/grammar/'+p.name,hashlib.sha256(p.read_bytes()).hexdigest()) for p in Path('public/grammar').glob('*.json')]
checks += [('/images/responsive/'+p.name,hashlib.sha256(p.read_bytes()).hexdigest()) for p in Path('public/images/responsive').glob('*.webp')]
checks += [('/audio/lookup/'+p.name,hashlib.sha256(p.read_bytes()).hexdigest()) for p in Path('public/audio/lookup').glob('*.json')]
checks += [(p['path'],hashlib.sha256(Path('public'+p['path']).read_bytes()).hexdigest()) for p in photos]
keys=list(dict.fromkeys(alias.values()));checks += [('/audio/'+keys[i]+'.mp3',None) for i in range(0,len(keys),max(1,len(keys)//24))][:24]
checks += [('/audio/index.json',hashlib.sha256(Path('public/audio/index.json').read_bytes()).hexdigest()),('/sw.js',None),('/manifest.webmanifest',None),('/sources/professional-contexts.html',None)]
html=requests.get(base+'/',timeout=10);html.raise_for_status()
checks += [(url,None) for url in re.findall(r'(?:src|href)="(/assets/[^" ]+)"',html.text)]
checks += [('/assets/'+p.name,hashlib.sha256(p.read_bytes()).hexdigest()) for p in Path('dist/assets').glob('*.js')]
unique={}
for path,sha in checks:unique[path]=sha or unique.get(path)
checks=list(unique.items())
def check(item):
 path,sha=item;r=requests.get(base+path,timeout=20)
 assert r.ok,(path,r.status_code)
 if sha:assert hashlib.sha256(r.content).hexdigest()==sha,('hash',path)
 if path.endswith('.mp3'):assert r.headers.get('Content-Type','').startswith('audio/'),path
 if path.endswith(('.jpg','.webp')):assert r.headers.get('Content-Type','').startswith('image/'),path
 return path
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:verified=list(pool.map(check,checks))
texts=json.load(open('data/audio-texts.json'))
def key(t):
 h=2166136261;u=t.encode('utf-16-le')
 for i in range(0,len(u),2):h=((h^int.from_bytes(u[i:i+2],'little'))*16777619)&0xffffffff
 return f'{h:08x}'
assert all(Path('dist/audio/'+key(t)+'.mp3').stat().st_size>200 for t in texts)
report={'httpResourcesVerified':len(verified),'contentPackages':len(m['packages']),'photoRecords':len(photos),'grammarPackages':len(list(Path('public/grammar').glob('*.json'))),'responsivePhotos':len(list(Path('public/images/responsive').glob('*.webp'))),'audioLookupShards':len(list(Path('public/audio/lookup').glob('*.json'))),'sampleMp3OverHttp':24,'requiredMp3PresentInBuild':len(texts),'browserRenderingVerified':False}
Path('data/production-check-report.json').write_text(json.dumps(report,indent=2));print(report)
