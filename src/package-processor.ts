import {decodePackage,indexItem,type PackageSpec} from './content-processing';
/** One worker per install, no database handles or user data leave the page. */
export function packageProcessor(){
 let worker:Worker|null=null,next=0;
 const waiting=new Map<number,{resolve:(rows:Record<string,any>[])=>void;reject:(e:Error)=>void}>();
 if(typeof Worker!=='undefined')try{
  worker=new Worker(new URL('./content-worker.ts',import.meta.url),{type:'module'});
  worker.onmessage=e=>{const item=waiting.get(e.data.id);if(!item)return;waiting.delete(e.data.id);e.data.error?item.reject(Error(e.data.error)):item.resolve(e.data.items);};
  worker.onerror=()=>{for(const item of waiting.values())item.reject(Error('Не удалось подготовить учебный пакет. Повторите загрузку.'));waiting.clear();worker?.terminate();worker=null;};
 }catch{/* Small cooperative batches on browsers without module workers. */}
 return {
  async parse(bytes:ArrayBuffer,pack:PackageSpec){
   if(worker){const id=++next;return new Promise<Record<string,any>[]>((resolve,reject)=>{waiting.set(id,{resolve,reject});worker!.postMessage({id,bytes,pack},[bytes]);});}
   const rows=await decodePackage(bytes,pack),items:Record<string,any>[]=[];
   for(let offset=0;offset<rows.length;offset+=128){items.push(...rows.slice(offset,offset+128).map(row=>indexItem(row,pack.id)));if(offset+128<rows.length)await new Promise<void>(r=>setTimeout(r,0));}
   return items;
  },
  close(){worker?.terminate();worker=null;for(const item of waiting.values())item.reject(Error('Загрузка остановлена'));waiting.clear();}
 };
}
