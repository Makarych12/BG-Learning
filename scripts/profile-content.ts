import 'fake-indexeddb/auto';
import { readFileSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { contentDB,searchLexemes } from '../src/library';
const m=JSON.parse(readFileSync('public/content/manifest.json','utf8'));
const parse:number[]=[];let words=0;
const start=performance.now();
for(const p of m.packages){const raw=readFileSync('public'+p.url,'utf8');const at=performance.now();const data=JSON.parse(raw);parse.push(performance.now()-at);if(p.kind==='dictionary'){await contentDB.lexemes.bulkPut(data.items.map((w:any)=>({...w,search:(w.bg+' '+w.ru).toLowerCase().split(/[^а-яѝa-z]+/).filter(Boolean)})));words+=data.items.length;}}
const installMs=performance.now()-start,queries=[];
for(const q of ['работ','локомотив','стол','вода','електр','учител','желез','съм']){const at=performance.now();const rows=await searchLexemes(q);queries.push({query:q,ms:performance.now()-at,returned:rows.length});}
const sorted=parse.sort((a,b)=>a-b);
const result={environment:'Node + fake-indexeddb; measures parsing and query work, not browser rendering or FPS',dictionaryEntries:words,packages:m.packages.length,installMs,parseMedianMs:sorted[Math.floor(sorted.length/2)],parseP95Ms:sorted[Math.floor(sorted.length*.95)],queries};writeFileSync('data/content-performance.json',JSON.stringify(result,null,2));console.log(result);await contentDB.delete();
