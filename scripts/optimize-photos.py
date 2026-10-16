"""Bound decoded size and transfer cost. Keep source downloads for reproducibility."""
from pathlib import Path
from PIL import Image,ImageOps
import shutil,json
originals=Path('data/sources/photo-originals');originals.mkdir(exist_ok=True)
before=after=0
for target in Path('public/images').glob('*.jpg'):
 source=originals/target.name
 if not source.exists():shutil.copy2(target,source)
 before+=source.stat().st_size
 with Image.open(source) as im:
  im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((720,560));im.save(target,'JPEG',quality=82,optimize=True,progressive=True)
 after+=target.stat().st_size
print('Photos:',round(before/1024/1024,1),'→',round(after/1024/1024,1),'MiB')
Path('data/photo-optimization.json').write_text(json.dumps({'sourceBytes':before,'optimizedBytes':after,'maxDimensions':[720,560],'change':'Размер уменьшен, JPEG-сжатие; исходники сохранены локально'}))
