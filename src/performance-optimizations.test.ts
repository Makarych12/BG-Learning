import {it,expect,vi,afterEach} from 'vitest';
import {packageProcessor} from './package-processor';
import {jsonResource} from './json-resource';
import {createVerbSearch} from './verb-search';
import {railwayBank,selectRailSession} from './rail-practice';
afterEach(()=>vi.unstubAllGlobals());
it('подготовка пакета сохраняет записи и индексы поиска без Worker',async()=>{
 vi.stubGlobal('Worker',undefined);vi.stubGlobal('crypto',{});
 const pack={id:'test-pack',kind:'dictionary',count:1,sha256:''};
 const input=new TextEncoder().encode(JSON.stringify({schema:1,kind:'dictionary',items:[{id:'word',bg:'ко́й',ru:'который',senses:[{gloss:'вопросительное местоимение'}]}]}));
 const processor=packageProcessor(),rows=await processor.parse(input.buffer,pack);processor.close();
 expect(rows[0].id).toBe('word');expect(rows[0].search).toEqual(expect.arrayContaining(['кой','который','местоимение']));expect(rows[0].search).not.toContain('кои');expect(rows[0].packId).toBe('test-pack');
});
it('обработка передаёт буфер в один Worker и освобождает его после установки',async()=>{
 let instance:any;class WorkerMock{onmessage:any;onerror:any;postMessage=vi.fn();terminate=vi.fn();constructor(){instance=this;}}
 vi.stubGlobal('Worker',WorkerMock);const processor=packageProcessor();
 const buffer=new ArrayBuffer(8),pack={id:'test',count:0,kind:'sentences',sha256:''};const result=processor.parse(buffer,pack);
 expect(instance.postMessage).toHaveBeenCalledWith({id:1,bytes:buffer,pack},[buffer]);instance.onmessage({data:{id:1,items:[{id:'preserved'}]}});
 expect(await result).toEqual([{id:'preserved'}]);processor.close();expect(instance.terminate).toHaveBeenCalledOnce();
});
it('одновременные запросы неизменившегося JSON объединяются, ошибка допускает повтор',async()=>{
 const fetcher=vi.fn(async()=>({ok:true,json:async()=>({items:[1,2]})}));vi.stubGlobal('fetch',fetcher);
 const [first,next]=await Promise.all([jsonResource('/test-dedupe.json'),jsonResource('/test-dedupe.json')]);expect(first).toBe(next);expect(fetcher).toHaveBeenCalledOnce();
 fetcher.mockResolvedValueOnce({ok:false,json:async()=>({items:[]})});await expect(jsonResource('/test-retry.json')).rejects.toThrow();await expect(jsonResource('/test-retry.json')).resolves.toEqual({items:[1,2]});
});
it('индекс глаголов сохраняет все результаты на обоих языках',()=>{
 const rows=[{bg:'чета',ru:'читать'},{bg:'прочета',ru:'прочитать'},{bg:'пиша',ru:'писать'}],search=createVerbSearch(rows);
 expect(search(' ЧЕТА ')).toEqual(rows.slice(0,2));expect(search('писать')).toEqual([rows[2]]);expect(search('')).toBe(rows);
});
it('кэшированные банки не меняются при генерации разных сессий',()=>{
 const bank=railwayBank('equipment'),before=JSON.stringify(bank),first=selectRailSession(bank,20,[]),next=selectRailSession(bank,20,[]);
 expect(railwayBank('equipment')).toBe(bank);expect(JSON.stringify(bank)).toBe(before);expect(first).toHaveLength(20);expect(next).toHaveLength(20);expect(new Set(first.map(t=>t.materialId)).size).toBe(20);
});
