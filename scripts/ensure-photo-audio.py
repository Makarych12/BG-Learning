"""Synthesizes (Piper) any photo label without audio and records its attribution, then reindexes."""
import json, subprocess, sys
from pathlib import Path
def key(t):
    h = 2166136261
    for i in range(0, len(t) * 2, 2): h = ((h ^ int.from_bytes(t.encode('utf-16-le')[i:i+2], 'little')) * 16777619) & 0xffffffff
    return f'{h:08x}'
photos = json.load(open('src/photos.json'))
attr = json.load(open('public/audio/ATTRIBUTION.json'))
labels = sorted({p['bg'] for p in photos})
need = [t for t in labels if key(t) not in attr or not Path(f'public/audio/{key(t)}.mp3').exists()]
print('photo labels', len(labels), 'missing audio/attribution', len(need), need)
if need:
    Path('scratch').mkdir(exist_ok=True); json.dump(need, open('scratch/need-audio.json', 'w'), ensure_ascii=False)
    subprocess.run(['.venv/bin/python', 'scripts/generate-audio.py', 'scratch/need-audio.json'], check=True)
    for t in need:
        attr[key(t)] = {'text': t, 'source': 'https://commons.wikimedia.org/', 'license': 'CC BY-SA 4.0', 'author': 'Подпись фотографии учебной карточки',
                        'voice': 'Piper bg_BG-dimitar-medium; synthetic speech; source voice dataset CC0'}
    json.dump(attr, open('public/audio/ATTRIBUTION.json', 'w'), ensure_ascii=False)
    subprocess.run([sys.executable, 'scripts/index-audio.py'], check=True)
