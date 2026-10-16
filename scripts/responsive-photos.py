"""Generate WebP sizes next to preserved JPEGs; metadata/licenses stay unchanged."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageOps
import json
photos=json.loads(Path('src/photos.json').read_text())
out=Path('public/images/responsive');out.mkdir(exist_ok=True)
def convert(photo):
 source=Path('public'+photo['path']);sizes={}
 with Image.open(source) as original:
  original=ImageOps.exif_transpose(original).convert('RGB')
  for width in (320,640):
   target=out/(source.stem+f'-{width}.webp')
   if not target.exists() or target.stat().st_mtime<source.stat().st_mtime:
    im=original.copy();im.thumbnail((width,width*560//720));im.save(target,'WEBP',quality=82,method=4)
   sizes[width]=target.stat().st_size
 return {'path':photo['path'],'sourceBytes':source.stat().st_size,'sizes':sizes,'widths':{width:Image.open(out/(source.stem+f'-{width}.webp')).width for width in (320,640)}}
with ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(convert,photos))
# Only a small set of filenames is needed at runtime, not duplicate license metadata.
Path('src/responsive-photos.json').write_text(json.dumps({Path(r['path']).stem:{'small':r['widths'][320],'large':r['widths'][640]} for r in rows},separators=(',',':')))
report={'photos':len(rows),'originalBytes':sum(r['sourceBytes'] for r in rows),'webp320Bytes':sum(r['sizes'][320] for r in rows),'webp640Bytes':sum(r['sizes'][640] for r in rows),'originalFilesPreserved':True}
Path('data/responsive-photo-report.json').write_text(json.dumps(report,indent=2));print(report)
