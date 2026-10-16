"""Download reusable corpus snapshots. Never invent a missing translation."""
from pathlib import Path
import requests,concurrent.futures
sources={
'bg-en-wiktionary.jsonl':'https://kaikki.org/dictionary/Bulgarian/kaikki.org-dictionary-Bulgarian.jsonl',
'bg-ru-wiktionary.jsonl':'https://kaikki.org/ruwiktionary/Болгарский/kaikki.org-dictionary-Болгарский.jsonl',
'bg-sentences.tsv.bz2':'https://downloads.tatoeba.org/exports/per_language/bul/bul_sentences_detailed.tsv.bz2',
'ru-sentences.tsv.bz2':'https://downloads.tatoeba.org/exports/per_language/rus/rus_sentences_detailed.tsv.bz2',
'links.tar.bz2':'https://downloads.tatoeba.org/exports/links.tar.bz2',
'audio.tar.bz2':'https://downloads.tatoeba.org/exports/sentences_with_audio.tar.bz2',
}
def fetch(item):
 name,url=item;p=Path('data/sources')/name
 if p.exists() and p.stat().st_size>20000:return (name,'existing',p.stat().st_size)
 with requests.get(url,stream=True,timeout=120,headers={'User-Agent':'ChameleonBG/0.2 educational corpus import'}) as r:
  r.raise_for_status()
  with p.with_suffix(p.suffix+'.part').open('wb') as f:
   for chunk in r.iter_content(1024*1024):f.write(chunk)
 p.with_suffix(p.suffix+'.part').rename(p)
 return(name,'downloaded',p.stat().st_size)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for f in concurrent.futures.as_completed([pool.submit(fetch,x) for x in sources.items()]):
  try:print(f.result(),flush=True)
  except Exception as e:print(type(e).__name__,str(e),flush=True)
