export const searchTokens = (text:string) => [...new Set(text.toLowerCase().normalize('NFD').replace(/[\u0300\u0301]/g,'').normalize('NFC').split(/[^а-яѝa-z0-9]+/).filter(Boolean))];
export type PackageSpec={id:string;kind:string;count:number;sha256:string};
export async function decodePackage(bytes:ArrayBuffer,pack:PackageSpec){
 if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',bytes);const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==pack.sha256)throw Error('Контрольная сумма пакета не совпадает');}
 const data=JSON.parse(new TextDecoder().decode(bytes));
 if(data.schema!==1||data.kind!==pack.kind||!Array.isArray(data.items)||data.items.length!==pack.count)throw Error('Неверный формат учебного пакета');
 return data.items as Record<string,any>[];
}
export function indexItem(x:Record<string,any>,packId:string){return {...x,packId,search:searchTokens(x.bg+' '+x.ru+' '+(x.senses??[]).map((s:{gloss:string})=>s.gloss).join(' '))};}
