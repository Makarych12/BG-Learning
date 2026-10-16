import {readFileSync,writeFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync('dist/.vite/manifest.json','utf8')) as Record<string,{file:string;imports?:string[];isEntry?:boolean}>;
const visited=new Set<string>();function visit(key:string){if(visited.has(key))return;visited.add(key);for(const next of manifest[key]?.imports??[])visit(next);}
for(const [key,item] of Object.entries(manifest))if(item.isEntry)visit(key);
const initial=[...visited].map(key=>manifest[key].file);
if(initial.some(file=>/curriculum|VoiceLab|ListeningLab|dialogues|photos-|railway-|rail-worker/.test(file)))throw Error('Educational dataset in initial graph');
const sw=readFileSync('dist/sw.js','utf8'),precache=[...sw.matchAll(/\{url:"([^"]+)"/g)].map(m=>m[1]);
if(!precache.length)throw Error('Unable to inspect generated precache');
if(precache.some(url=>/^(?:images|audio|content)\//.test(url)))throw Error('Bulk media/data in precache');
for(const file of initial)if(!precache.includes(file))throw Error('Shell dependency not cached: '+file);
for(const url of precache.filter(url=>url.endsWith('.js')))if(!initial.includes(url)&&!url.includes('workbox-window'))throw Error('Dynamic data precached: '+url);
const report={initialStaticModules:initial,precacheEntries:precache.length,precacheBytes:precache.reduce((n,url)=>n+readFileSync('dist/'+url).byteLength,0),largeDatasetsInInitialGraph:false,bulkMediaInPrecache:false,browserRenderingVerified:false};
writeFileSync('data/performance-build-check.json',JSON.stringify(report,null,2));console.log(report);
