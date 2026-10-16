import {db} from './storage';
import {railSections,type RailSection} from './rail-sections';
import type {Mechanic,Task} from './library';
export type RailCounts={tasks:number;materials:number}[];
let worker:Worker|null=null,serial=0,broken=false,idle:ReturnType<typeof setTimeout>|undefined;
const waiting=new Map<number,{resolve:(data:any)=>void;reject:(error:Error)=>void}>();
export function releaseRailEngine(){clearTimeout(idle);worker?.terminate();worker=null;for(const item of waiting.values())item.reject(Error('Загрузка раздела остановлена'));waiting.clear();}
function startWorker(){
 if(worker)return worker;if(broken||typeof Worker==='undefined')return null;
 try{worker=new Worker(new URL('./rail-worker.ts',import.meta.url),{type:'module'});worker.onmessage=e=>{const item=waiting.get(e.data.id);if(!item)return;waiting.delete(e.data.id);e.data.error?item.reject(Error(e.data.error)):item.resolve(e.data.result);if(!waiting.size)idle=setTimeout(releaseRailEngine,45000);};worker.onerror=()=>{broken=true;releaseRailEngine();};return worker;}catch{return null;}
}
async function request<T>(payload:Record<string,unknown>):Promise<T|undefined>{
 const current=startWorker();if(!current)return undefined;clearTimeout(idle);const id=++serial;
 return new Promise<T>((resolve,reject)=>{const timeout=setTimeout(()=>{broken=true;releaseRailEngine();},15000);waiting.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});try{current.postMessage({...payload,id});}catch(e){waiting.delete(id);reject(e as Error);}}).catch(error=>{if(broken)return undefined;throw error;});
}
export async function railCounts(mode:Mechanic|'mixed'):Promise<RailCounts>{
 const result=await request<RailCounts>({kind:'stats',mode});if(result)return result;
 const {railwayBank}=await import('./rail-practice');const rows:RailCounts=[];
 for(const s of railSections){const bank=railwayBank(s.id).filter(t=>mode==='mixed'||t.type===mode);rows.push({tasks:bank.length,materials:new Set(bank.map(t=>t.materialId)).size});await new Promise<void>(r=>setTimeout(r,0));}return rows;
}
export async function railSession(section:RailSection,count:number,mode:Mechanic|'mixed'):Promise<Task[]>{
 const attempts=await db.attempts.where('exerciseId').startsWith('rail-').or('exerciseId').startsWith('term-').toArray();
 const result=await request<Task[]>({kind:'session',section,count,mode,attempts});if(result)return result;
 const {railwayBank,selectRailSession}=await import('./rail-practice');return selectRailSession(railwayBank(section),count,attempts,mode);
}
