"""Adds hand-written example sentences (scripts/editorial_examples.py) as package sentences-editorial-001,
links them FIRST in the `examples` of active dictionary entries that have no verified direct context,
updates manifest hashes and records attribution/audio for Piper. Idempotent; run after content:enrich."""
import json, glob, hashlib, re, subprocess, sys
from pathlib import Path
sys.path.insert(0, 'scripts')
from editorial_examples import EX
C = Path('public/content')
def dump(o): return json.dumps(o, ensure_ascii=False, separators=(',', ':'))
strip = lambda s: s.replace('\u0301', '').lower()
files = sorted(glob.glob('public/content/dictionary-*.json'))
packs = {f: json.load(open(f)) for f in files}
# clean any prior editorial links from dictionary packs to ensure idempotency and prevent homonym pollution
for d in packs.values():
    for w in d['items']:
        w['examples'] = [x for x in w['examples'] if not x.startswith('editorial-ex-')]

# index lexemes by exact lemma for all words (for the `lexemes` field of sentences)
by_bg = {}
for d in packs.values():
    for w in d['items']: by_bg.setdefault(strip(w['bg']), []).append(w)

sentences, added_links, word_hits = [], 0, 0
for spec, rows in EX.items():
    if '#' in spec:
        base_lemma, tag = spec.split('#', 1)
    elif ':' in spec:
        base_lemma, tag = spec.split(':', 1)
    else:
        base_lemma, tag = spec, None

    candidates = [w for w in by_bg.get(base_lemma, []) if w.get('active')]
    if tag == 'verb':
        targets = [w for w in candidates if w.get('pos') == 'verb']
    elif tag == 'noun':
        targets = [w for w in candidates if w.get('pos') == 'noun']
    elif tag == 'pron':
        targets = [w for w in candidates if w.get('pos') == 'pron']
    elif tag == 'adv':
        targets = [w for w in candidates if w.get('pos') == 'adv']
    elif tag == 'chess':
        targets = [w for w in candidates if 'шахм' in w.get('ru', '')]
    elif tag == 'ruler':
        targets = [w for w in candidates if 'истор' in w.get('ru', '')]
    elif tag and tag.startswith('wiki-'):
        targets = [w for w in candidates if w['id'] == tag]
    else:
        targets = candidates

    if not targets:
        print('no active entry matching', spec)
        continue

    ids = []
    for i, (bg, ru) in enumerate(rows):
        sid = f'editorial-ex-{hashlib.sha1((spec + bg).encode()).hexdigest()[:10]}'
        ids.append(sid)
        sentences.append({'id': sid, 'bg': bg, 'ru': ru, 'translations': [], 'author': 'CHAMELEON BG · авторские учебные предложения',
            'source': '/sources/editorial-examples.html', 'license': 'Авторские учебные материалы', 'review': 'editorial-language-practice',
            'audio': None, 'words': len(re.findall(r'[\w\u0400-\u04ff]+', bg)), 'lexemes': [w['id'] for w in targets],
            'difficulty': 'Короткое предложение', 'difficultyMethod': 'Длина текста; не сертифицированный CEFR',
            'grammar': 'Составлено вручную; не сертифицировано экспертом-лингвистом'})
    for w in targets:
        new = [x for x in ids if x not in w['examples']]
        if new: w['examples'] = new + w['examples']; added_links += len(new); word_hits += 1
pkg = {'schema': 1, 'version': json.load(open(C / 'manifest.json'))['version'], 'kind': 'sentences', 'items': sentences}
(C / 'sentences-editorial-001.json').write_text(dump(pkg))
for f, d in packs.items(): Path(f).write_text(dump(d))
m = json.load(open(C / 'manifest.json'))
def entry(pid, kind, title, path, count):
    b = path.read_bytes(); return {'id': pid, 'kind': kind, 'title': title, 'count': count, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest(), 'url': '/content/' + path.name}
for p in m['packages']:
    path = C / Path(p['url']).name
    if p['id'].startswith('dictionary') and str(path) in packs: p.update(bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
m['packages'] = [p for p in m['packages'] if p['id'] != 'sentences-editorial-001'] + [entry('sentences-editorial-001', 'sentences', 'Авторские учебные предложения', C / 'sentences-editorial-001.json', len(sentences))]
m['counts']['sentences'] = sum(p['count'] for p in m['packages'] if p['kind'] == 'sentences')
(C / 'manifest.json').write_text(json.dumps(m, ensure_ascii=False, indent=2))
Path('public/sources/editorial-examples.html').write_text('<!doctype html><meta charset="utf-8"><title>Авторские учебные предложения</title><h1>Авторские учебные предложения CHAMELEON BG</h1><p>Предложения составлены вручную для активных слов без прямого переведённого контекста. Они не заимствованы из внешних корпусов и не прошли независимую экспертную проверку носителя языка.</p>')
print('sentences', len(sentences), 'entries linked', word_hits, 'links', added_links)
# audio
texts = sorted({s['bg'] for s in sentences}); Path('scratch').mkdir(exist_ok=True); json.dump(texts, open('scratch/editorial-audio.json', 'w'), ensure_ascii=False)
