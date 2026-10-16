import requests,json,re,time,concurrent.futures
from pathlib import Path
H={'User-Agent':'ChameleonBG/0.2 educational application; licensed image attribution'}
# A semantic subject is retained. Illustrations/diagrams are excluded.
subjects=[('Chair','стол'),('Table (furniture)','маса'),('Hammer','чук'),('Screwdriver','отвертка'),('Wrench','гаечен ключ'),('Apple','ябълка'),('Bicycle','велосипед'),('Bus','автобус'),('Coffee','кафе'),('Bread','хляб'),('Mountain','планина'),('River','река'),('Electric motor','електрически двигател'),('Transformer','трансформатор'),('Pantograph (transport)','токоприемник'),('Bogie','талига'),('Wheelset (rail transport)','колоос'),('Air compressor','компресор'),('Pressure measurement','манометър'),('Railroad switch','стрелка'),('Railway signal','железопътен сигнал'),('Contact line','контактна мрежа')]
photos=[]
for title,bg in subjects:
 try:
  r=requests.get('https://en.wikipedia.org/w/api.php',params={'action':'query','titles':title,'prop':'pageimages','piprop':'name|original','format':'json'},headers=H,timeout=25).json();p=next(iter(r['query']['pages'].values()));filename=p.get('pageimage','')
  if not filename or filename.lower().endswith(('.svg','.png','.gif')):continue
  info=requests.get('https://commons.wikimedia.org/w/api.php',params={'action':'query','titles':'File:'+filename,'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':640,'format':'json'},headers=H,timeout=25).json();entry=next(iter(info['query']['pages'].values()));i=entry['imageinfo'][0];m=i['extmetadata'];license=m.get('LicenseShortName',{}).get('value','')
  if not any(x in license for x in ['CC BY','CC0','Public domain']):continue
  url=i.get('thumburl',i['url']).split('?')[0];im=requests.get(url,headers=H,timeout=25)
  if im.status_code!=200:continue
  name='subject-'+str(len(photos)+1)+'.jpg';Path('public/images/'+name).write_bytes(im.content)
  photos.append({'id':'photo-'+str(len(photos)+1),'bg':bg,'subject':title,'path':'/images/'+name,'author':re.sub('<[^>]*>','',m.get('Artist',{}).get('value','Wikimedia contributor')),'source':i['descriptionurl'],'license':license,'licenseUrl':m.get('LicenseUrl',{}).get('value',''),'description':re.sub('<[^>]*>','',m.get('ImageDescription',{}).get('value',''))[:600],'review':'source-subject-matched'})
  print(title,license,len(im.content),flush=True)
 except Exception as e:print(title,str(e)[:100],flush=True)
Path('src/photos.json').write_text(json.dumps(photos,ensure_ascii=False,indent=2))
