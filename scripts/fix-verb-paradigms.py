"""Repairs paradigms whose source template belonged to a different lemma.

Detected by comparing the lemma with the 1st-person present: the wiktionary table of
гъделичкам, мацам, мичам, мотолевя, нагарчам, пожелая, хукам, цопам was copied from another word
(e.g. гъделичкам → «ровичкам»). All forms are re-stemmed on the lemma; the endings and
conjugation class from the source are kept. Idempotent. Run after import-verb-paradigms.py.
"""
import json, glob
FIX = {'гъделичкам': 2, 'мацам': 2, 'мичам': 2, 'нагарчам': 2, 'хукам': 2, 'цопам': 2, 'мотолевя': 1, 'пожелая': 1}
def restem(value, old, new):
    if isinstance(value, str): return new + value[len(old):] if value.startswith(old) else value
    if isinstance(value, list): return [restem(x, old, new) for x in value]
    if isinstance(value, dict): return {k: restem(x, old, new) for k, x in value.items()}
    return value
def fix_list(verbs):
    n = 0
    for v in verbs:
        k = FIX.get(v['bg'])
        if not k or v['present'][0] == v['bg']: continue
        old, new = v['present'][0][:-k], v['bg'][:-k]
        for key in ('present', 'aorist', 'imperfect', 'participle', 'plural', 'participles', 'imperative', 'presentParticiple'):
            if key in v: v[key] = restem(v[key], old, new)
        v['review'] = 'community-source-restemmed-on-lemma'; n += 1
    return n
total = 0
for f in sorted(glob.glob('public/grammar/verbs-*.json')) + ['src/verb-paradigms.json']:
    data = json.load(open(f)); n = fix_list(data)
    if n:
        sep = (',', ':') if f.startswith('src') else None
        open(f, 'w').write(json.dumps(data, ensure_ascii=False, separators=sep)); total += n
print('repaired', total)
