import {createVerbSearch} from "../src/verb-search";
import { readFileSync,readdirSync,writeFileSync,existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { railwayBank,railSections,selectRailSession } from '../src/rail-practice';
const phase=process.argv[2]??'after';
const measure=(run:()=>unknown,n=7)=>{const times=[];for(let i=0;i<n;i++){const start=performance.now();run();times.push(performance.now()-start);}return {firstMs:times[0],medianMs:[...times].sort((a,b)=>a-b)[Math.floor(n/2)],maxMs:Math.max(...times)};};
const rail=measure(()=>railSections.map(s=>railwayBank(s.id)));
const bank=railwayBank('equipment');const selection=measure(()=>selectRailSession(bank,15,[]));
const catalog=JSON.parse(readFileSync('public/grammar/catalog.json','utf8')) as {bg:string;ru:string}[];
const searchIndex=createVerbSearch(catalog);
const search=measure(()=>{for(const q of ['работ','чета','говор','съм','провер','читать'])searchIndex(q);},25);
const assets=existsSync('dist/assets')?readdirSync('dist/assets').filter(n=>n.endsWith('.js')).map(name=>{const bytes=readFileSync('dist/assets/'+name);return {name,bytes:bytes.length,gzipBytes:gzipSync(bytes).length};}):[];
const entry=existsSync('dist/index.html')?readFileSync('dist/index.html','utf8').match(/type="module"[^>]*src="\/assets\/([^" ]+\.js)"/)?.[1]:undefined;
const visited=new Set<string>();function visit(name:string){if(visited.has(name))return;visited.add(name);const source=readFileSync('dist/assets/'+name,'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*)["']\.\/([^"']+\.js)["']/g))visit(match[1]);}
if(entry)visit(entry);
const initial=assets.filter(a=>visited.has(a.name));
const report={phase,environment:'Node performance API; not browser paint, FPS, interaction latency or device RAM',railBuildAllSections:rail,railSelect15:selection,verbSearchSixQueries:search,initialStaticJS:{bytes:initial.reduce((n,a)=>n+a.bytes,0),gzipBytes:initial.reduce((n,a)=>n+a.gzipBytes,0),modules:initial.map(a=>a.name)},totalJS:{bytes:assets.reduce((n,a)=>n+a.bytes,0),gzipBytes:assets.reduce((n,a)=>n+a.gzipBytes,0)},assets};
writeFileSync(`data/performance-${phase}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,assets:undefined},null,2));
