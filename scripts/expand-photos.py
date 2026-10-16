"""Download traceable Commons photographs via an explicit concept mapping.
No search-result proximity matching; keep article, file, author and license.
"""
import requests,json,re,time,concurrent.futures
from pathlib import Path
from PIL import Image
from io import BytesIO
mapping='''Apple|ябълка
Pear|круша
Peach|праскова
Apricot|кайсия
Plum|слива
Cherry|череша
Strawberry|ягода
Raspberry|малина
Blackberry|къпина
Blueberry|боровинка
Grape|грозде
Banana|банан
Orange (fruit)|портокал
Lemon|лимон
Lime (fruit)|лайм
Pineapple|ананас
Watermelon|диня
Melon|пъпеш
Pumpkin|тиква
Cucumber|краставица
Tomato|домат
Potato|картоф
Carrot|морков
Onion|лук
Garlic|чесън
Cabbage|зеле
Cauliflower|карфиол
Broccoli|броколи
Spinach|спанак
Lettuce|маруля
Radish|репичка
Beetroot|цвекло
Eggplant|патладжан
Zucchini|тиквичка
Pea|грах
Lentil|леща
Chickpea|нахут
Rice|ориз
Wheat|пшеница
Maize|царевица
Oat|овес
Barley|ечемик
Rye|ръж
Sunflower|слънчоглед
Walnut|орех
Hazelnut|лешник
Almond|бадем
Peanut|фъстък
Pistachio|шамфъстък
Honey|мед
Butter|масло
Cheese|сирене
Yogurt|кисело мляко
Egg as food|яйце
Salt|сол
Sugar|захар
Black pepper|черен пипер
Cinnamon|канела
Tea|чай
Beer|бира
Wine|вино
Spoon|лъжица
Fork|вилица
Kitchen knife|кухненски нож
Plate (dishware)|чиния
Bowl|купа
Drinking glass|чаша
Saucepan|тенджера
Frying pan|тиган
Kettle|чайник
Refrigerator|хладилник
Microwave oven|микровълнова печка
Dishwasher|съдомиялна машина
Washing machine|пералня
Vacuum cleaner|прахосмукачка
Iron (appliance)|ютия
Sewing machine|шевна машина
Sofa|диван
Bed|легло
Wardrobe|гардероб
Desk|бюро
Bookcase|библиотека
Mirror|огледало
Carpet|килим
Pillow|възглавница
Blanket|одеяло
Curtain|завеса
Candle|свещ
Light bulb|електрическа крушка
Door|врата
Window|прозорец
Stairs|стълба
Roof|покрив
Chimney|комин
Fence|ограда
Gate|порта
Key (lock)|ключ
Padlock|катинар
Clock|часовник
Watch|ръчен часовник
Umbrella|чадър
Backpack|раница
Suitcase|куфар
Wallet|портфейл
Belt (clothing)|колан
Hat|шапка
Scarf|шал
Glove|ръкавица
Sock|чорап
Shoe|обувка
Boot|ботуш
Shirt|риза
T-shirt|тениска
Trousers|панталон
Skirt|пола
Dress|рокля
Coat|палто
Jacket|яке
Button|копче
Zipper|цип
Needle|игла
Scissors|ножица
Comb|гребен
Toothbrush|четка за зъби
Soap|сапун
Towel|кърпа
Bathtub|вана
Shower|душ
Toilet|тоалетна
Broom|метла
Bucket|кофа
Shovel|лопата
Rake (tool)|гребло
Axe|брадва
Saw|трион
Drill|бормашина
Pliers|клещи
Screw|винт
Nut (hardware)|гайка
Bolt (fastener)|болт
Nail (fastener)|пирон
Washer (hardware)|шайба
Vise|менгеме
Anvil|наковалня
File (tool)|пила
Chisel|длето
Soldering iron|поялник
Multimeter|мултиметър
Vernier caliper|шублер
Micrometer (device)|микрометър
Spirit level|нивелир
Tape measure|рулетка
Lathe|струг
Milling machine|фреза
Welding|заваряване
Hard hat|предпазна каска
Fire extinguisher|пожарогасител
Electric motor|електродвигател
Transformer|трансформатор
Electrical relay|реле
Contactor|контактор
Circuit breaker|прекъсвач
Fuse (electrical)|предпазител
Electrical insulator|изолатор
Electric generator|генератор
Alternator|алтернатор
Electric battery|батерия
Resistor|резистор
Capacitor|кондензатор
Inductor|бобина
Diode|диод
Transistor|транзистор
Printed circuit board|печатна платка
Electric switch|електрически ключ
Electrical connector|електрически съединител
Power cable|захранващ кабел
Electricity meter|електромер
Voltmeter|волтметър
Ammeter|амперметър
Oscilloscope|осцилоскоп
Pump|помпа
Valve|клапан
Ball valve|сферичен кран
Pipe (fluid conveyance)|тръба
Hose|маркуч
Radiator|радиатор
Fan (machine)|вентилатор
Bearing (mechanical)|лагер
Ball bearing|сачмен лагер
Gear|зъбно колело
Shaft (mechanical engineering)|вал
Coupling|съединител
Spring (device)|пружина
Piston|бутало
Cylinder (engine)|цилиндър
Crankshaft|колянов вал
Camshaft|разпределителен вал
Flywheel|маховик
Brake disc|спирачен диск
Drum brake|барабанна спирачка
Railroad tie|траверса
Rail profile|релса
Track ballast|баласт
Railroad switch|железопътна стрелка
Wheelset (rail transport)|колоос
Railway coupling|вагонен съединител
Buffer (rail transport)|буфер
Overhead line|контактна мрежа
Third rail|трета релса
Railway turntable|обръщателен кръг
Railway roundhouse|локомотивно депо
Railway platform|перон
Level crossing|железопътен прелез
Catenary|верижна линия
Railway brake|влакова спирачка
Air brake (rail)|въздушна спирачка
Railway tunnel|железопътен тунел
Truss bridge|фермов мост
Freight car|товарен вагон
Tank car|цистерна
Boxcar|покрит вагон
Flatcar|платформа
Hopper car|хопер
Steam locomotive|парен локомотив
Diesel locomotive|дизелов локомотив
Electric locomotive|електрически локомотив
Tram|трамвай
Trolleybus|тролейбус
Metro station|метростанция
Car|автомобил
Truck|камион
Motorcycle|мотоциклет
Tractor|трактор
Excavator|багер
Bulldozer|булдозер
Forklift|мотокар
Crane (machine)|кран
Ambulance|линейка
Fire engine|пожарна кола
Airplane|самолет
Helicopter|хеликоптер
Ship|кораб
Boat|лодка
Lighthouse|фар
Anchor|котва
Oar|гребло
Dog|куче
Cat|котка
Horse|кон
Donkey|магаре
Cattle|говедо
Sheep|овца
Goat|коза
Pig|свиня
Rabbit|заек
Chicken|кокошка
Duck|патица
Goose|гъска
Turkey (bird)|пуйка
Pigeon|гълъб
Sparrow|врабче
Eagle|орел
Owl|бухал
Stork|щъркел
Swan|лебед
Fox|лисица
Wolf|вълк
Bear|мечка
Deer|елен
Squirrel|катерица
Hedgehog|таралеж
Frog|жаба
Turtle|костенурка
Snake|змия
Lizard|гущер
Chameleon|хамелеон
Butterfly|пеперуда
Bee|пчела
Ant|мравка
Ladybird|калинка
Dragonfly|водно конче
Snail|охлюв
Spider|паяк
Octopus|октопод
Crab|рак
Dolphin|делфин
Whale|кит
Shark|акула
Salmon|сьомга
Trout|пъстърва
Oak|дъб
Beech|бук
Birch|бреза
Pine|бор
Spruce|смърч
Willow|върба
Rose|роза
Tulip|лале
Daffodil|нарцис
Daisy|маргаритка
Lavender|лавандула
Waterfall|водопад
Lake|езеро
Island|остров
Volcano|вулкан
Glacier|ледник
Cave|пещера
Beach|плаж
Desert|пустиня
Forest|гора
Rainbow|дъга
Snowflake|снежинка
Cloud|облак
Lightning|мълния
Moon|луна
Sun|слънце
Earth|земя
Globe|глобус
Map|карта
Compass|компас
Telescope|телескоп
Microscope|микроскоп
Camera|фотоапарат
Binoculars|бинокъл
Guitar|китара
Violin|цигулка
Piano|пиано
Trumpet|тромпет
Flute|флейта
Accordion|акордеон
Drum|барабан
Football (ball)|футболна топка
Basketball (ball)|баскетболна топка
Tennis racket|тенис ракета
Ski|ска
Ice skate|кънка
Swimming pool|басейн
Traffic light|светофар
Stop sign|знак стоп'''
subjects=dict(line.split('|') for line in mapping.splitlines());photos=json.load(open('src/photos.json'));existing={p['subject'] for p in photos} | {p['subject'] for p in json.load(open('data/photo-review/excluded.json'))};subjects={k:v for k,v in subjects.items() if k not in existing}
H={'User-Agent':'ChameleonBG/0.3 educational language corpus (https://github.com/chameleon-bg; offline attributed thumbnails)'}
s=requests.Session();s.headers.update(H)
def get(url,**kw):
 for attempt in range(4):
  try:
   r=s.get(url,timeout=50,**kw)
   if r.status_code in [429,503]:
    print('Throttle',r.status_code,r.text[:100],flush=True);time.sleep(15*(attempt+1));continue
   r.raise_for_status();return r
  except requests.RequestException:
   if attempt==3:raise
   time.sleep(2)
 raise RuntimeError('retry limit')
files={}
for start in range(0,len(subjects),40):
 titles=list(subjects)[start:start+40]
 response=get('https://en.wikipedia.org/w/api.php',params={'action':'query','titles':'|'.join(titles),'prop':'pageimages','piprop':'name','format':'json','redirects':1}).json()
 redirects={r['to']:r['from'] for r in response.get('query',{}).get('redirects',[])}
 for p in response.get('query',{}).get('pages',{}).values():
  name=p.get('pageimage','');title=p['title'];title=redirects.get(title,title)
  if name.lower().endswith(('.jpg','.jpeg','.png')) and title in subjects:files[name.replace('_',' ')]=title
 print('Article batch',start,len(files),flush=True)
Path('data/sources/photo-articles.json').write_text(json.dumps(files))
entries=[]
for start in range(0,len(files),15):
 time.sleep(3)
 batch=list(files)[start:start+15]
 response=get('https://commons.wikimedia.org/w/api.php',params={'action':'query','titles':'|'.join('File:'+x for x in batch),'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':640,'iiextmetadatafilter':'Artist|LicenseShortName|LicenseUrl|ImageDescription','format':'json'}).json()
 for p in response.get('query',{}).get('pages',{}).values():
  if not p.get('imageinfo'):continue
  info=p['imageinfo'][0];m=info.get('extmetadata',{});license=m.get('LicenseShortName',{}).get('value','');name=p['title'][5:].replace('_',' ')
  if name not in files or not any(x in license for x in ['CC BY','CC0','Public domain']):continue
  title=files[name];entries.append((title,info,m,license))
 print('Metadata batch',start,len(entries),flush=True)
 Path('data/sources/photo-metadata.json').write_text(json.dumps(entries))
def download(entry):
 title,info,m,license=entry
 try:
  data=get(info.get('thumburl',info['url'])).content;image=Image.open(BytesIO(data));image.verify()
  if image.format == 'PNG':
   image=Image.open(BytesIO(data)).convert('RGB');buf=BytesIO();image.save(buf,'JPEG',quality=85);data=buf.getvalue()
  return {'bg':subjects[title],'subject':title,'author':re.sub('<[^>]*>','',m.get('Artist',{}).get('value','Wikimedia contributor')),'source':info['descriptionurl'],'license':license,'licenseUrl':m.get('LicenseUrl',{}).get('value',''),'description':re.sub('<[^>]*>','',m.get('ImageDescription',{}).get('value',''))[:500],'review':'article-concept-matched','article':'https://en.wikipedia.org/wiki/'+title.replace(' ','_')},data
 except Exception as e:print('Skip',title,str(e)[:90],flush=True);return None
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for result in pool.map(download,entries):
  if not result:continue
  item,data=result;number=max(int(p['id'].split('-')[-1]) for p in photos)+1;name=f'concept-{number}.jpg';Path('public/images/'+name).write_bytes(data);item.update(id=f'photo-{number}',path='/images/'+name);photos.append(item)
  Path('src/photos.json').write_text(json.dumps(photos,ensure_ascii=False,indent=2))
  if number%20==0:print('Photos',number,flush=True)
print('Total',len(photos),flush=True)
