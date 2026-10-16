import requests,json,re,time
from pathlib import Path
H={'User-Agent':'ChameleonBG/0.2 educational source attribution'}
subjects={'Apple':'ябълка','Bicycle':'велосипед','Bus':'автобус','Coffee':'кафе','Bread':'хляб','Mountain':'планина','River':'река','Electric motor':'електрически двигател','Transformer':'трансформатор','Pantograph (transport)':'токоприемник','Bogie':'талига','Wheelset (rail transport)':'колоос','Air compressor':'компресор','Pressure measurement':'манометър','Railroad switch':'стрелка','Railway signal':'железопътен сигнал'}
pages=json.load(open('data/sources/more-photos.json'))['query']['pages'];files={p.get('pageimage').replace('_',' '):p['title'] for p in pages.values() if p.get('pageimage','').lower().endswith(('.jpg','.jpeg'))}
r=requests.get('https://commons.wikimedia.org/w/api.php',params={'action':'query','titles':'|'.join('File:'+x for x in files),'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':640,'format':'json'},headers=H,timeout=40);r.raise_for_status();entries=r.json()['query']['pages']
photos=json.load(open('src/photos.json'))
for entry in entries.values():
 try:
  filename=entry['title'][5:].replace('_',' ');title=files[filename];i=entry['imageinfo'][0];m=i['extmetadata'];license=m.get('LicenseShortName',{}).get('value','')
  if not any(x in license for x in ['CC BY','CC0','Public domain']):continue
  if any(p['subject']==title for p in photos):continue
  im=requests.get(i.get('thumburl',i['url']).split('?')[0],headers=H,timeout=40)
  if im.status_code!=200:print(title,im.status_code,flush=True);continue
  name='subject-'+str(len(photos)+1)+'.jpg';Path('public/images/'+name).write_bytes(im.content)
  photos.append({'id':'photo-'+str(len(photos)+1),'bg':subjects[title],'subject':title,'path':'/images/'+name,'author':re.sub('<[^>]*>','',m.get('Artist',{}).get('value','Wikimedia contributor')),'source':i['descriptionurl'],'license':license,'licenseUrl':m.get('LicenseUrl',{}).get('value',''),'description':re.sub('<[^>]*>','',m.get('ImageDescription',{}).get('value',''))[:600],'review':'source-subject-matched'})
  print(title,license,len(im.content),flush=True)
 except Exception as e:print(str(e),flush=True)
Path('src/photos.json').write_text(json.dumps(photos,ensure_ascii=False,indent=2))
