import {it,expect,vi,afterEach} from 'vitest';
import {contentDB,installContent,type Catalog} from './library';
afterEach(()=>vi.unstubAllGlobals());
it('после ухода из раздела новая загрузка продолжает прерванную установку без потери готового пакета',async()=>{
 await contentDB.lexemes.clear();await contentDB.packages.clear();
 vi.stubGlobal('Worker',undefined);vi.stubGlobal('crypto',{});
 const fetcher=vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify({schema:1,kind:'dictionary',items:[{id:url.startsWith('/first')?'first':'second',bg:'дума',ru:'слово',senses:[]}]})).buffer}));
 vi.stubGlobal('fetch',fetcher);
 const catalog={schema:1,version:'fixture',packages:['first','second'].map(id=>({id,kind:'dictionary',count:1,sha256:'',url:'/'+id,title:id,bytes:1}))} as Catalog;
 const controller=new AbortController();let next:Promise<void>|undefined;
 await installContent(catalog,done=>{if(done===1){controller.abort();next=installContent(catalog,()=>{},new AbortController().signal);}},controller.signal);
 await next;
 expect(await contentDB.lexemes.count()).toBe(2);expect(await contentDB.packages.count()).toBe(2);
 expect(fetcher).toHaveBeenCalledTimes(2);
});
