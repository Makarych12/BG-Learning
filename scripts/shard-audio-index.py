"""Derived lookup files; keep the original catalogue and every MP3 unchanged."""
import json
from pathlib import Path
index=json.loads(Path('public/audio/index.json').read_text())
def key(text):
 h=2166136261
 raw=text.encode('utf-16-le')
 for i in range(0,len(raw),2):h=((h^int.from_bytes(raw[i:i+2],'little'))*16777619)&0xffffffff
 return f'{h:08x}'
parts={f'{i:02x}':{} for i in range(256)}
for text,file in index.items():parts[key(text)[:2]][text]=file
out=Path('public/audio/lookup');out.mkdir(exist_ok=True)
for prefix,rows in parts.items():(out/(prefix+'.json')).write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
sizes=[p.stat().st_size for p in out.glob('*.json')]
Path('data/audio-lookup-report.json').write_text(json.dumps({'aliases':len(index),'shards':len(parts),'originalBytes':Path('public/audio/index.json').stat().st_size,'maxShardBytes':max(sizes),'medianShardBytes':sorted(sizes)[len(sizes)//2]},indent=2))
print('Audio lookup: 256 shards, maximum',max(sizes),'bytes')
