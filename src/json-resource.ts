/** Deduplicate in-flight requests and keep a small LRU of parsed immutable resources. */
const ready=new Map<string,unknown>(),pending=new Map<string,Promise<unknown>>();
export async function jsonResource<T>(url:string):Promise<T>{
 if(ready.has(url)){const value=ready.get(url);ready.delete(url);ready.set(url,value);return value as T;}
 let promise=pending.get(url);
 if(!promise){promise=fetch(url).then(r=>{if(!r.ok)throw Error('Не удалось загрузить '+url);return r.json();}).then(value=>{ready.set(url,value);while(ready.size>12)ready.delete(ready.keys().next().value!);return value;}).finally(()=>pending.delete(url));pending.set(url,promise);}
 return promise as Promise<T>;
}
