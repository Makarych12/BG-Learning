import type {ProfilerOnRenderCallback} from 'react';
export const runtimeTimings:{name:string;ms:number;at:number}[]=[];
export const reactCommits:{id:string;phase:string;actualMs:number;baseMs:number}[]=[];
export function recordTiming(name:string,ms:number){runtimeTimings.push({name,ms,at:performance.now()});if(runtimeTimings.length>100)runtimeTimings.shift();}
export const recordReactCommit:ProfilerOnRenderCallback=(id,phase,actualMs,baseMs)=>{reactCommits.push({id,phase,actualMs,baseMs});if(reactCommits.length>200)reactCommits.shift();};
let navigation:{page:string;start:number}|null=null;
export function beginNavigation(page:string){navigation={page,start:performance.now()};}
export function finishNavigation(page:string,stage='shell'){if(navigation?.page===page)recordTiming(`${page}:${stage}`,performance.now()-navigation.start);}
export function performanceSnapshot(){
 const nav=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
 const resources=performance.getEntriesByType('resource') as PerformanceResourceTiming[];
 const memory=(performance as Performance&{memory?:{usedJSHeapSize:number;totalJSHeapSize:number}}).memory;
 return {navigation:nav?{domContentLoadedMs:nav.domContentLoadedEventEnd,loadMs:nav.loadEventEnd,transferBytes:nav.transferSize}:null,javascript:resources.filter(r=>/\.js(?:\?|$)/.test(r.name)).map(r=>({url:r.name,transferBytes:r.transferSize,decodedBytes:r.decodedBodySize,ms:r.duration})),heap:memory?{usedBytes:memory.usedJSHeapSize,totalBytes:memory.totalJSHeapSize}:null,timings:[...runtimeTimings],react:[...reactCommits]};
}
