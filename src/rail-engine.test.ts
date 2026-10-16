import {it,expect,vi,afterEach} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('Worker возвращает статистику правильному запросу и завершается при закрытии раздела',async()=>{
 vi.resetModules();vi.useFakeTimers();let current:any;
 class WorkerMock{onmessage:any;onerror:any;postMessage=vi.fn();terminate=vi.fn();constructor(){current=this;}}
 vi.stubGlobal('Worker',WorkerMock);const engine=await import('./rail-engine');
 const mixed=engine.railCounts('mixed'),correction=engine.railCounts('correction');
 expect(current.postMessage).toHaveBeenCalledTimes(2);
 const first=current.postMessage.mock.calls[0][0],second=current.postMessage.mock.calls[1][0];
 current.onmessage({data:{id:second.id,result:[{tasks:6,materials:6}]}});current.onmessage({data:{id:first.id,result:[{tasks:3949,materials:1313}]}});
 expect(await correction).toEqual([{tasks:6,materials:6}]);expect(await mixed).toEqual([{tasks:3949,materials:1313}]);
 engine.releaseRailEngine();expect(current.terminate).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
