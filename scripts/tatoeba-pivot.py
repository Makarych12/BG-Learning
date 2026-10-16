"""Count / build BG-RU Tatoeba pairs linked through a shared intermediate sentence (human links only)."""
import bz2, tarfile, collections, json, re, sys
from pathlib import Path
root = Path('data/sources')
def ids(name):
    d = {}
    with bz2.open(root / name, 'rt') as f:
        for l in f:
            p = l.rstrip('\n').split('\t')
            if len(p) >= 4: d[int(p[0])] = (p[2], p[3] if p[3] not in ('', '\\N') else 'Tatoeba contributors (см. источник)')
    return d
bg = ids('bg-sentences.tsv.bz2'); ru = ids('ru-sentences.tsv.bz2')
adj = collections.defaultdict(set)
with tarfile.open(root / 'links.tar.bz2', 'r|bz2') as tar:
    for m in tar:
        for l in tar.extractfile(m):
            a, b = map(int, l.split()); adj[a].add(b); adj[b].add(a)
direct = {b for b in bg if any(x in ru for x in adj[b])}
pivot = {}
for b in bg:
    if b in direct: continue
    for mid in adj[b]:
        hit = [x for x in adj[mid] if x in ru and x != b]
        if hit: pivot[b] = (mid, hit[0]); break
print('bg', len(bg), 'direct', len(direct), 'pivot', len(pivot))
json.dump({str(b): [m, r, bg[b][0], bg[b][1], ru[r][0], ru[r][1]] for b, (m, r) in pivot.items()},
          open('data/sources/tatoeba-pivot-pairs.json', 'w'), ensure_ascii=False)
