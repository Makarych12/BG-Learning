import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
class MockAudio {
  static instances: MockAudio[] = [];
  src = ''; volume = 1; playbackRate = 1; preservesPitch = true;
  onended: (()=>void)|null=null; onerror: (()=>void)|null=null; onplaying:(()=>void)|null=null;
  play = vi.fn(async()=>{ this.onplaying?.(); }); pause=vi.fn(); load=vi.fn(); removeAttribute=vi.fn();
  constructor(){MockAudio.instances.push(this);}
}
const flush = async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
beforeEach(()=>{vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=> 'blob:test-audio'),revokeObjectURL:vi.fn()}));vi.resetModules();MockAudio.instances=[];vi.stubGlobal('Audio',MockAudio);vi.stubGlobal('fetch',vi.fn(async(input)=>String(input).includes('/api/tts')?new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'audio/mpeg'}}):({ok:true,json:async()=>({'вода':'abc12345','=вода́':'abc12345'})})));vi.stubGlobal('speechSynthesis',{cancel:vi.fn(),getVoices:vi.fn(()=>[]),addEventListener:vi.fn(),removeEventListener:vi.fn(),speak:vi.fn()});});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe('Единый болгарский звук',()=>{
 it('нормализует пробелы и ударение, сохраняя й и ѝ',async()=>{const {normalizeAudioText:n}=await import('./speech');expect(n('  Вода̀!  ')).toBe('вода');expect(n('ко́й')).not.toBe(n('кои'));expect(n('ѝ')).not.toBe(n('и'));expect(n('Добър\n ден.')).toBe('добър ден');});
 it('использует существующий файл для варианта с ударением',async()=>{const s=await import('./speech');s.speak('Вода́!',vi.fn());await flush();const a=MockAudio.instances[0];expect(a.src).toBe('/audio/abc12345.mp3');expect(s.audioState().status).toBe('playing');expect(speechSynthesis.speak).not.toHaveBeenCalled();a.onended?.();await flush();expect(s.audioState().status).toBe('idle');});
 it('при ошибке файла запускает серверный болгарский TTS',async()=>{const s=await import('./speech');s.speak('вода',vi.fn());await flush();const a=MockAudio.instances[0];a.onerror?.();await flush();expect(a.src).toBe('blob:test-audio');expect(s.audioState().source).toContain('сервер');s.stopSpeech();});
 it('отмена во время загрузки индекса исключает запоздалое воспроизведение',async()=>{let ready!:(v:Response)=>void;vi.mocked(fetch).mockReturnValueOnce(new Promise(resolve=>ready=resolve) as Promise<Response>);const s=await import('./speech');s.speak('старый текст',vi.fn());s.stopSpeech();ready({ok:true,json:async()=>({})} as Response);await flush();expect(MockAudio.instances[0].play).not.toHaveBeenCalled();expect(s.audioState().status).toBe('idle');});
 it('останавливает очередь даже до получения duration',async()=>{const s=await import('./speech');const onLine=vi.fn();const pending=s.speakSequence(['вода','гара'],vi.fn(),.85,onLine);await flush();s.stopSpeech();await pending;expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(1);expect(onLine).toHaveBeenCalledWith(0);expect(onLine).not.toHaveBeenCalledWith(1);expect(onLine).toHaveBeenLastCalledWith(-1);});
 it('никогда не выбирает русский или английский голос',async()=>{vi.useFakeTimers();vi.mocked(speechSynthesis.getVoices).mockReturnValue([{lang:'ru-RU',localService:true},{lang:'en-US',localService:true}] as SpeechSynthesisVoice[]);const s=await import('./speech');const notify=vi.fn();s.speak('вода',notify);await flush();const a=MockAudio.instances[0];a.onerror?.();await flush();a.onerror?.();await flush();expect(speechSynthesis.speak).not.toHaveBeenCalled();expect(s.audioState().status).toBe('error');expect(notify).toHaveBeenCalledWith(expect.stringContaining('недоступно'));expect(notify.mock.calls.join(' ')).not.toMatch(/установ/);s.stopSpeech();});
 it('скорость и громкость меняются у текущей записи',async()=>{const s=await import('./speech');s.speak('вода',vi.fn());await flush();s.configureAudio({rate:1.15,volume:.5});expect(MockAudio.instances[0].playbackRate).toBeCloseTo(1.15/.85);expect(MockAudio.instances[0].volume).toBe(.5);s.stopSpeech();});
});
it('кэширует один файл для эквивалентных записей и сообщает точный прогресс',async()=>{
 const put=vi.fn(),open=vi.fn(async()=>({match:vi.fn(async()=>undefined),put}));vi.stubGlobal('caches',{open});
 vi.mocked(fetch).mockImplementation(async(input)=> String(input).includes('/audio/lookup/') ? {ok:true,json:async()=>({'вода':'abc12345','=вода́':'abc12345'})} as Response : new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'audio/mpeg'}}));
 const {cacheAudio}=await import('./speech');const progress=vi.fn();await cacheAudio(['вода',' ВОДА! '],progress);
 expect(put.mock.calls.filter(c=>String(c[0]).endsWith('.mp3'))).toHaveLength(1);expect(progress).toHaveBeenLastCalledWith(1,1);
});
it('визуализатор получает узел реального MediaElementSource и нормализация останавливается',async()=>{
 vi.useFakeTimers();
 const compressor={connect:vi.fn(),threshold:{value:0},knee:{value:0},ratio:{value:0}};
 const gain={connect:vi.fn(()=>compressor),gain:{value:0,setTargetAtTime:vi.fn()}};
 const analyser={fftSize:0,smoothingTimeConstant:0,connect:vi.fn(()=>gain),getFloatTimeDomainData:vi.fn((data:Float32Array)=>data.fill(.1))};
 const input={connect:vi.fn(()=>analyser)};
 class Context{destination={};currentTime=0;createMediaElementSource=vi.fn(()=>input);createDynamicsCompressor=vi.fn(()=>compressor);createGain=vi.fn(()=>gain);createAnalyser=vi.fn(()=>analyser);resume=vi.fn(async()=>{});}
 vi.stubGlobal('AudioContext',Context);
 const s=await import('./speech');s.speak('вода',vi.fn());await flush();
 expect(s.audioAnalyser()).toBe(analyser);expect(input.connect).toHaveBeenCalledWith(analyser);expect(analyser.connect).toHaveBeenCalledWith(gain);
 await vi.advanceTimersByTimeAsync(130);expect(gain.gain.setTargetAtTime).toHaveBeenCalled();s.stopSpeech();const calls=gain.gain.setTargetAtTime.mock.calls.length;await vi.advanceTimersByTimeAsync(300);expect(gain.gain.setTargetAtTime).toHaveBeenCalledTimes(calls);
});
it('сохраняет завершённую серверную фразу под адресом MP3 для офлайн-повтора',async()=>{
 const put=vi.fn();vi.stubGlobal('caches',{open:vi.fn(async()=>({put}))});
 vi.mocked(fetch).mockImplementation(async(input)=>String(input).includes('/audio/lookup/') ? {ok:true,json:async()=>({'вода':'abc12345','=вода́':'abc12345'})} as Response : new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'audio/mpeg'}}));
 const s=await import('./speech');s.speak('вода',vi.fn());await flush();const a=MockAudio.instances[0];a.onerror?.();await flush();a.onended?.();await flush();expect(put).toHaveBeenCalledWith('/audio/abc12345.mp3',expect.objectContaining({ok:true}));s.stopSpeech();
});
it('выбранный урок воспроизводится офлайн без индекса и сети, Blob освобождается',async()=>{
 const stored=new Map<string,Response>();
 const cache={match:vi.fn(async(key:string)=>stored.get(key)?.clone()),put:vi.fn(async(key:string,value:Response)=>{stored.set(key,value.clone());}),keys:vi.fn(async()=>[]),delete:vi.fn(async()=>true)};
 vi.stubGlobal('caches',{open:vi.fn(async()=>cache)});
 vi.mocked(fetch).mockImplementation(async(input)=>String(input).includes('/audio/lookup/')?{ok:true,json:async()=>({'вода':'abc12345'})} as Response:new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'audio/mpeg'}}));
 const s=await import('./speech');await s.cacheAudio(['вода'],vi.fn());
 vi.mocked(fetch).mockClear();vi.mocked(fetch).mockRejectedValue(Error('offline'));
 s.speak('ВОДА!',vi.fn());await flush();
 expect(MockAudio.instances[0].src).toBe('blob:test-audio');expect(fetch).not.toHaveBeenCalled();
 MockAudio.instances[0].onended?.();await flush();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-audio');s.stopSpeech();
});
it('подготовка аудио на главной не скачивает полный каталог',async()=>{
 const s=await import('./speech');await s.prepareAudio();expect(fetch).not.toHaveBeenCalled();
});
it('пауза сохраняет позицию и очередь, продолжение не загружает звук заново',async()=>{
 const s=await import('./speech');s.speak('вода',vi.fn());await flush();
 const audio=MockAudio.instances[0],before=audio.src,requests=vi.mocked(fetch).mock.calls.length;
 s.pauseSpeech();expect(s.audioState().status).toBe('paused');expect(audio.pause).toHaveBeenCalled();
 await s.resumeSpeech();expect(s.audioState().status).toBe('playing');expect(audio.src).toBe(before);expect(vi.mocked(fetch).mock.calls).toHaveLength(requests);
 s.stopSpeech();expect(s.audioState().status).toBe('idle');
});
it('долгая пауза не запускает запасной источник и не теряет запись',async()=>{
 vi.useFakeTimers();const s=await import('./speech');s.speak('вода',vi.fn());await flush();
 s.pauseSpeech();await vi.advanceTimersByTimeAsync(120000);expect(s.audioState().status).toBe('paused');expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes('/api/tts'))).toBe(false);
 await s.resumeSpeech();expect(s.audioState().status).toBe('playing');s.stopSpeech();
});
