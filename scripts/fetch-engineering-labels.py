"""Wikidata CC0: explicit BG/RU labels on the same entity; bounded subclass depth.
No machine translation and no composing new terminology by templates.
"""
import requests,json,time,concurrent.futures
from pathlib import Path
classes={'Q39546':'Инструменты','Q11653':'Электронные компоненты','Q107388855':'Электрические компоненты','Q10541872':'Рельсовые транспортные средства','Q1414135':'Подвижной состав','Q1311670':'Железнодорожная инфраструктура','Q2041172':'Измерительные приборы','Q107715':'Физические величины','Q839546':'Детали машин','Q11019':'Машины','Q11460':'Материалы','Q80006':'Обработка металлов','Q18524':'Крепёжные изделия','Q72313':'Электродвигатели','Q227341':'Железнодорожные сигналы','Q488383':'Тормозные системы','Q424165':'Силовая электроника','Q753162':'Электрические цепи'}
# Only the first nine roots above are already verified; remaining roots are not fetched
# until their entity descriptions are checked by the importer operator.
classes={k:v for k,v in classes.items() if k in {'Q39546','Q11653','Q107388855','Q10541872','Q1414135','Q1311670','Q2041172','Q107715','Q839546'}}
root=Path('data/sources/wikidata');root.mkdir(exist_ok=True)
def job(item):
 qid,topic=item;q=f'SELECT DISTINCT ?item ?bg ?ru WHERE {{ ?item wdt:P279/wdt:P279? wd:{qid}; rdfs:label ?bg; rdfs:label ?ru. FILTER(LANG(?bg)="bg" && LANG(?ru)="ru") }} LIMIT 1000'
 path=root/(qid+'.json')
 if path.exists():return
 try:
  r=requests.get('https://query.wikidata.org/sparql',params={'query':q,'format':'json'},headers={'User-Agent':'ChameleonBG/0.3 educational terminology','Accept':'application/sparql-results+json'},timeout=55)
  if not r.ok:print(qid,r.status_code,flush=True);return
  try:data=r.json()['results']['bindings']
  except ValueError:
   s=r.text;i=s.index('[',s.index('"bindings"'))+1;data=[];decoder=json.JSONDecoder()
   while i<len(s):
    i+=len(s[i:])-len(s[i:].lstrip())
    try:row,end=decoder.raw_decode(s,i);data.append(row);i=end
    except ValueError:break
    if s[i:].lstrip().startswith(','):i+=s[i:].index(',')+1
    else:break
  path.write_text(json.dumps({'root':qid,'topic':topic,'query':q,'rows':data},ensure_ascii=False));print(qid,topic,len(data),flush=True)
 except Exception as e:print(qid,type(e).__name__,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(job,classes.items()))
