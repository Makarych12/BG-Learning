import type {ManifestTransform} from "workbox-build";
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
/** Keep dynamic learning data out of install-time fetching; visited modules cache on demand. */
export const precacheShell:ManifestTransform=async(entries)=>{
 const manifest=JSON.parse(readFileSync(resolve('dist/.vite/manifest.json'),'utf8')) as Record<string,{file:string;imports?:string[];isEntry?:boolean}>;
 const allowed=new Set<string>(),seen=new Set<string>();
 const visit=(key:string)=>{if(seen.has(key))return;seen.add(key);const item=manifest[key];if(!item)return;allowed.add(item.file);for(const dependency of item.imports??[])visit(dependency);};
 for(const [key,entry] of Object.entries(manifest))if(entry.isEntry)visit(key);
 return {manifest:entries.filter(entry=>!entry.url.endsWith('.js')||allowed.has(entry.url)||entry.url.includes('workbox-window')),warnings:[]};
};
