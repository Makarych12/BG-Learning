import fs from 'node:fs';
import photos from '../src/photos.json';
import {sentenceReviewReason} from '../src/content-quality';
const dir='public/content';
const norm=(s:string)=>s.normalize('NFC').replace(/\u0301/g,'').toLocaleLowerCase('bg').trim();
const load=(re:RegExp)=>fs.readdirSync(dir).filter(f=>re.test(f)).flatMap(f=>JSON.parse(fs.readFileSync(dir+'/'+f,'utf8')).items as any[]);
const words=load(/^dictionary(-reverse)?-\d+\.json$/);
const sents=new Map(load(/^sentences.*\.json$/).map(s=>[s.id,s]));
const photoKeys=new Set(photos.map((p:any)=>norm(p.bg)));
const matched=new Set<string>();
for(const w of words){const k=norm(w.bg);if(photoKeys.has(k))matched.add(k);}
console.log('words',words.length,'sentences',sents.size,'photos',photos.length,'matched',matched.size,'unmatched',photos.filter((p:any)=>!matched.has(norm(p.bg))).map((p:any)=>p.bg).join(', '));
const dist:Record<number,number>={};const poor:any[]=[];let active=0;
for(const w of words.filter(w=>w.active)){active++;const good=w.examples.map((id:string)=>sents.get(id)).filter((s:any)=>s&&s.ru&&!sentenceReviewReason(s));const n=Math.min(good.length,8);dist[n]=(dist[n]||0)+1;if(good.length<5)poor.push(w);}
console.log('active',active,'good examples dist',dist);
const rs:Record<string,number>={};for(const s of sents.values()){const r=s.review;rs[r]=(rs[r]||0)+1}console.log(rs);
fs.writeFileSync('scratch/poor.json',JSON.stringify(poor.map(w=>w.bg)));
