"""Second-pass photo import via bg.wikipedia article lead images (sitelinks), restricted to dictionary nouns.

Safety rules (no guessing):
 * a bg.wikipedia article must have exactly the dictionary noun as its title (no redirects, no disambiguation);
 * its ru.wikipedia interlanguage title must appear as a whole word in that dictionary entry's Russian gloss;
 * humans, disambiguation pages, films, albums, games and lists are excluded;
 * only CC0 / Public domain / CC BY(-SA) files are kept; author, source and license are stored;
 * images are resized to <=480 px wide and re-encoded as optimized JPEG.
Resumable: candidates are cached in data/sources/photo-wp-candidates.json.
Usage: python scripts/expand-photos-wikidata.py [max_new_photos]
"""
import json, re, sys, time, glob, concurrent.futures
from io import BytesIO
from pathlib import Path
from urllib.parse import unquote
import requests
from PIL import Image

MAX_NEW = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
H = {'User-Agent': 'ChameleonBG/0.4 educational language app (offline attributed thumbnails)'}
S = requests.Session(); S.headers.update(H)
norm = lambda s: s.replace('\u0301', '').replace('\u0300', '').lower().strip()

def get(url, **kw):
    for attempt in range(5):
        try:
            r = S.get(url, timeout=60, **kw)
            if r.status_code in (429, 503):
                print('Throttle', r.status_code, flush=True); time.sleep(20 * (attempt + 1)); continue
            r.raise_for_status(); return r
        except requests.RequestException:
            if attempt == 4: raise
            time.sleep(3)

photos = json.load(open('src/photos.json'))
have = {norm(p['bg']) for p in photos}
excluded = Path('data/photo-review/excluded.json')
if excluded.exists(): have |= {norm(p.get('bg', '')) for p in json.load(excluded.open())}

# --- 1. dictionary nouns -------------------------------------------------
nouns = {}
for f in sorted(glob.glob('public/content/dictionary-*.json')):
    for it in json.load(open(f))['items']:
        if it.get('pos') != 'noun' or ' ' in it['bg'].strip(): continue
        key = norm(it['bg'])
        if key in have or len(key) < 3: continue
        gloss = ' '.join([it.get('ru', '')] + [s.get('gloss', '') for s in it.get('senses', [])]).lower()
        nouns[key] = (nouns.get(key, '') + ' ' + gloss)
print('Candidate nouns', len(nouns), flush=True)


# --- 2. bg.wikipedia candidates ----------------------------------------------
cand_path = Path('data/sources/photo-wp-candidates.json')
cands = json.load(cand_path.open()) if cand_path.exists() else {'done': [], 'rows': {}}
done = set(cands['done'])
keys = [k for k in nouns if k not in done]
for start in range(0, len(keys), 40):
    batch = keys[start:start + 40]
    titles = {k[:1].upper() + k[1:]: k for k in batch}
    try:
        resp = get('https://bg.wikipedia.org/w/api.php', params={'action': 'query', 'format': 'json', 'titles': '|'.join(titles),
            'prop': 'pageprops|pageimages|langlinks', 'ppprop': 'wikibase_item|disambiguation', 'piprop': 'name', 'lllang': 'ru', 'lllimit': 500}).json()
    except Exception as e:
        print('error', type(e).__name__, flush=True); time.sleep(10); continue
    for p in resp.get('query', {}).get('pages', {}).values():
        k = titles.get(p.get('title', ''))
        pp = p.get('pageprops', {})
        if not k or 'disambiguation' in pp or 'wikibase_item' not in pp or not p.get('pageimage') or not p.get('langlinks'): continue
        ru = re.sub(r'\s*\(.*?\)', '', p['langlinks'][0]['*']).strip()
        if not re.search(r'(?<![\w-])' + re.escape(ru.lower()) + r'(?![\w-])', nouns.get(k, '')): continue
        cands['rows'][k] = {'qid': pp['wikibase_item'], 'ru': ru, 'file': p['pageimage'].replace('_', ' ')}
    cands['done'] += batch
    if (start // 40) % 10 == 0:
        cand_path.write_text(json.dumps(cands, ensure_ascii=False)); print('WP', start + len(batch), '/', len(keys), 'matches', len(cands['rows']), flush=True)
    time.sleep(0.3)
cand_path.write_text(json.dumps(cands, ensure_ascii=False))
print('WP matches', len(cands['rows']), flush=True)

# --- 2b. concreteness filter via wbgetentities (no heavy transitive SPARQL) -------
ROOTS = {'Q223557', 'Q811979', 'Q618123', 'Q2095', 'Q39546', 'Q16521', 'Q11344', 'Q34379', 'Q42889', 'Q11460', 'Q8205328'}
REJECT = {'Q4936952', 'Q28640', 'Q5', 'Q7239'}  # anatomical structure, profession, human
cands.setdefault('concrete', {}); cands.setdefault('parents', {})
def entities(ids, props):
    out = {}
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        for attempt in range(4):
            try:
                r = S.get('https://www.wikidata.org/w/api.php', params={'action': 'wbgetentities', 'ids': '|'.join(chunk), 'props': 'claims', 'format': 'json'}, timeout=60)
                if r.status_code == 429: time.sleep(20); continue
                r.raise_for_status(); out.update(r.json().get('entities', {})); break
            except Exception: time.sleep(5)
        time.sleep(0.4)
    return out
def claim_ids(ent, prop):
    return [c['mainsnak']['datavalue']['value']['id'] for c in ent.get('claims', {}).get(prop, []) if c['mainsnak'].get('datavalue')]
pending = [c['qid'] for c in cands['rows'].values() if c['qid'] not in cands['concrete']]
inst = {}
for q, ent in entities(pending, 'claims').items(): inst[q] = claim_ids(ent, 'P31')
frontier = {c for v in inst.values() for c in v if c not in cands['parents']}
for depth in range(7):
    if not frontier: break
    got = entities(sorted(frontier), 'claims')
    for q, ent in got.items(): cands['parents'][q] = claim_ids(ent, 'P279')
    for q in frontier: cands['parents'].setdefault(q, [])
    frontier = {p for q in got for p in cands['parents'][q] if p not in cands['parents']}
    print('Class graph depth', depth, 'known', len(cands['parents']), flush=True)
def ancestors(q):
    seen, stack = set(), [q]
    while stack:
        x = stack.pop()
        if x in seen: continue
        seen.add(x); stack += cands['parents'].get(x, [])
    return seen
for q in pending:
    anc = set().union(*[ancestors(c) for c in inst.get(q, [])]) if inst.get(q) else set()
    cands['concrete'][q] = bool(anc & ROOTS) and not (anc & REJECT)
cand_path.write_text(json.dumps(cands, ensure_ascii=False))
STOP = {'анус', 'аборт', 'пенис', 'вагина', 'секс', 'порно', 'труп', 'оргия'}
cands['rows'] = {bg: c for bg, c in cands['rows'].items() if cands['concrete'].get(c['qid']) and bg not in STOP}
print('Concrete candidates', len(cands['rows']), flush=True)

# --- 3. Commons metadata -------------------------------------------------
todo = [(bg, c) for bg, c in cands['rows'].items() if bg not in have and c['file'].lower().endswith(('.jpg', '.jpeg', '.png'))][:MAX_NEW]
print('To fetch', len(todo), flush=True)
entries = []
for start in range(0, len(todo), 40):
    batch = todo[start:start + 40]
    resp = get('https://commons.wikimedia.org/w/api.php', params={
        'action': 'query', 'titles': '|'.join('File:' + c['file'] for _, c in batch), 'prop': 'imageinfo',
        'iiprop': 'url|extmetadata', 'iiurlwidth': 480, 'format': 'json', 'redirects': 1,
        'iiextmetadatafilter': 'Artist|LicenseShortName|LicenseUrl|ImageDescription'}).json()
    redirects = {r['to'].replace('_', ' '): r['from'].replace('_', ' ') for r in resp.get('query', {}).get('redirects', [])}
    byfile = {c['file']: (bg, c) for bg, c in batch}
    for p in resp.get('query', {}).get('pages', {}).values():
        if not p.get('imageinfo'): continue
        title = p['title'][5:].replace('_', ' '); title = redirects.get('File:' + title, redirects.get(title, title)).replace('File:', '')
        hit = byfile.get(title) or byfile.get(p['title'][5:].replace('_', ' '))
        if not hit: continue
        info = p['imageinfo'][0]; m = info.get('extmetadata', {}); lic = m.get('LicenseShortName', {}).get('value', '')
        if not any(x in lic for x in ['CC BY', 'CC0', 'Public domain']) or 'NC' in lic or 'ND' in lic: continue
        entries.append((hit[0], hit[1], info, m, lic))
    print('Metadata', start + len(batch), len(entries), flush=True)
    time.sleep(2)

# --- 4. download + optimize ---------------------------------------------
strip = lambda s: re.sub(r'<[^>]*>', '', s).strip()
def download(e):
    bg, c, info, m, lic = e
    try:
        data = get(info.get('thumburl', info['url'])).content
        img = Image.open(BytesIO(data)); img.load(); img = img.convert('RGB')
        if img.width < 200 or img.height < 150: return None
        if img.width > 480: img = img.resize((480, round(img.height * 480 / img.width)), Image.LANCZOS)
        buf = BytesIO(); img.save(buf, 'JPEG', quality=78, optimize=True, progressive=True)
        return {'bg': bg, 'subject': c['qid'], 'author': strip(m.get('Artist', {}).get('value', 'Wikimedia contributor'))[:200],
                'source': info['descriptionurl'], 'license': lic, 'licenseUrl': m.get('LicenseUrl', {}).get('value', ''),
                'description': strip(m.get('ImageDescription', {}).get('value', ''))[:300],
                'review': 'wikidata-label-ru-gloss-matched', 'wikidata': 'https://www.wikidata.org/wiki/' + c['qid']}, buf.getvalue()
    except Exception as ex:
        print('Skip', bg, str(ex)[:80], flush=True); return None

number = max(int(p['id'].split('-')[-1]) for p in photos)
added = 0
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for res in pool.map(download, entries):
        if not res: continue
        item, data = res; number += 1
        name = f'wd-{number}.jpg'; Path('public/images/' + name).write_bytes(data)
        item.update(id=f'photo-{number}', path='/images/' + name); photos.append(item); added += 1
        if added % 100 == 0:
            Path('src/photos.json').write_text(json.dumps(photos, ensure_ascii=False, indent=1)); print('Photos', len(photos), flush=True)
Path('src/photos.json').write_text(json.dumps(photos, ensure_ascii=False, indent=1))
print('Total', len(photos), 'added', added, flush=True)
