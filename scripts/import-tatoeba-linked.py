"""Add Tatoeba BG-RU pairs whose Russian translation is linked through a shared intermediate sentence.
Both hops are human-made Tatoeba links (no machine translation). Items are flagged
review='tatoeba-linked-via-intermediate' so the UI/validators can distinguish them from direct pairs.
Run after scripts/tatoeba-pivot.py; then run scripts/enrich-contexts.py to link words.
"""
import json, re, hashlib, unicodedata
from pathlib import Path
out = Path('public/content'); m = json.load((out / 'manifest.json').open())
norm = lambda s: ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')
existing = set()
for p in m['packages']:
    if p['kind'] == 'sentences':
        existing |= {norm(s['bg']) for s in json.load((out / (p['id'] + '.json')).open())['items']}
pairs = json.load(open('data/sources/tatoeba-pivot-pairs.json'))
BAD = re.compile(r'\b(еба|педера|курв|путк|шибан|копеле|fuck|бляд|нахуй|сука|убий|убива|секс|голи|порн)', re.I)
items = []
for bid, (mid, rid, bg, bg_author, ru, ru_author) in sorted(pairs.items(), key=lambda kv: int(kv[0])):
    if norm(bg) in existing or not (5 <= len(bg) <= 300) or '<' in bg or BAD.search(bg + ' ' + ru): continue
    if not re.search('[а-яА-Я]', ru) or len(ru) > 400: continue
    existing.add(norm(bg))
    items.append({'id': f'tatoeba-{bid}', 'bg': bg, 'ru': ru, 'translations': [{'id': rid, 'text': ru, 'author': ru_author, 'via': mid}],
                  'author': bg_author, 'source': f'https://tatoeba.org/en/sentences/show/{bid}', 'license': 'CC BY 2.0 FR',
                  'review': 'tatoeba-linked-via-intermediate', 'audio': None, 'words': len(bg.split()),
                  'lexemes': [], 'difficulty': '', 'difficultyMethod': '', 'grammar': ''})
print('New sentences', len(items))
m['packages'] = [p for p in m['packages'] if not p['id'].startswith('sentences-linked-')]
for f in out.glob('sentences-linked-*.json'): f.unlink()
for i in range(0, len(items), 500):
    pid = f'sentences-linked-{i // 500 + 1:03}'; f = out / (pid + '.json')
    f.write_text(json.dumps({'schema': 1, 'version': m['version'], 'kind': 'sentences', 'items': items[i:i + 500]}, ensure_ascii=False, separators=(',', ':')))
    m['packages'].append({'id': pid, 'kind': 'sentences', 'title': 'Контексты Tatoeba (перевод через общее предложение)', 'url': '/content/' + f.name})
for p in m['packages']:
    raw = (out / (p['id'] + '.json')).read_bytes(); p.update(count=len(json.loads(raw)['items']), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
for s in m['sources']:
    if s['name'] == 'Tatoeba':
        s['attribution'] = ('Авторы болгарских и русских предложений указаны у каждого примера. Основная часть — прямые переводные связи; '
                            'дополнительные пары (review=tatoeba-linked-via-intermediate) получены по двум человеческим связям Tatoeba через общее '
                            'предложение другого языка, без машинного перевода; такие переводы могут быть менее буквальными.')
(out / 'manifest.json').write_text(json.dumps(m, ensure_ascii=False, indent=2))
