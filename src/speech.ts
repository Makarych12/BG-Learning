/** One Bulgarian playback pipeline. Recorded/synthesized assets → server → real bg voice. */
export const normalizeAudioText = (text: string) => text.normalize('NFC').replace(/ѝ/g, '\ue000').normalize('NFD').replace(/[\u0300\u0301]/g, '').normalize('NFC').replace(/\ue000/g, 'ѝ').replace(/\s+/gu, ' ').trim().replace(/[.!?…]+$/u, '').toLocaleLowerCase('bg');
export function audioKey(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash.toString(16).padStart(8, '0');
}
type State = { status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'; text: string; source: string; error: string; rate: number; volume: number };
const preferencesKey = 'chameleon-audio-preferences';
function savedPreferences() {
  try {const saved=JSON.parse(localStorage.getItem(preferencesKey) ?? '{}');return saved&&typeof saved==='object'?saved:{};} catch { return {}; }
}
const preferences = savedPreferences();
let state: State = { status: 'idle', text: '', source: '', error: '', rate: Number.isFinite(preferences.rate) ? Math.max(.5,Math.min(1.5,preferences.rate)) : 1, volume: Number.isFinite(preferences.volume) ? Math.max(0,Math.min(1,preferences.volume)) : .85 };
const listeners = new Set<() => void>();
export const audioState = () => state;
export const subscribeAudio = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const update = (change: Partial<State>) => { if(Object.entries(change).every(([key,value])=>state[key as keyof State]===value))return;state = { ...state, ...change }; listeners.forEach(fn => fn()); };
let element: HTMLAudioElement | null = null, context: AudioContext | null = null, analyser: AnalyserNode | null = null;
let requestAbort: AbortController | null = null;
let playbackBlocked = false;
function abortable<T>(promise: Promise<T>, signal: AbortSignal):Promise<T> {
  return new Promise((resolve,reject)=>{
    const abort=()=>{signal.removeEventListener('abort',abort);reject(new DOMException('Cancelled','AbortError'));};
    if(signal.aborted){abort();return;}
    signal.addEventListener('abort',abort,{once:true});
    promise.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
  });
}
let clearSequence: (()=>void) | null = null;
let pauseWatchdog: (() => void) | null = null, resumeWatchdog: (() => void) | null = null;
let generation = 0, cancelPending: (() => void) | null = null;
const aliases=new Map<string,Promise<Record<string,string>>>();
export function prepareAudio(text?:string):Promise<Record<string,string>> {
  if(!text)return Promise.resolve({});
  const prefix=audioKey(text).slice(0,2),url='/audio/lookup/'+prefix+'.json';
  const cached=aliases.get(prefix);if(cached){aliases.delete(prefix);aliases.set(prefix,cached);return cached;}
  const request=fetch(url,{signal:AbortSignal.timeout(4000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>{aliases.delete(prefix);return {};});
  aliases.set(prefix,request);while(aliases.size>8)aliases.delete(aliases.keys().next().value!);return request;
}
function lookupKey(text:string){
 const stressed=/[\u0300\u0301]/.test(text.replace(/ѝ/g,'').normalize('NFD'));
 const exact=text.normalize('NFC').replace(/\s+/g,' ').trim().replace(/[.!?…]+$/u,'').toLocaleLowerCase('bg');
 return stressed?'='+exact:normalizeAudioText(text);
}
const offlineKey=(key:string)=>'/audio/offline-lookup/'+audioKey(key)+'.json?key='+encodeURIComponent(key);
async function assetUrl(text:string){
 const key=lookupKey(text);
 try{if('caches' in globalThis){const saved=await(await caches.open('chameleon-audio-offline-v1')).match(offlineKey(key));if(saved){const url=await saved.text();if(/^\/audio\/[0-9a-f]{8}\.mp3$/.test(url))return url;}}}catch{/* Older cache implementations can still use the file lookup. */}
 const lookup=await prepareAudio(key);return '/audio/'+(lookup[key]??audioKey(text))+'.mp3';
}
export function audioAnalyser() { return analyser; }
function player() {
  if (!element) { element = new Audio(); element.preload = 'metadata'; element.preservesPitch = true; }
  // Mobile speech stays on the native media path: a suspended WebAudio graph can
  // otherwise advance the media clock while producing silence on Android.
  const nativeOnly = /Android|iPhone|iPad/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
  try {
    if (!nativeOnly && !context && typeof AudioContext !== 'undefined') {
      context = new AudioContext();
      const input = context.createMediaElementSource(element);
      analyser = context.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .75;
      input.connect(analyser).connect(context.destination);
    }
    void context?.resume().catch(() => {});
  } catch { /* Browser without Web Audio: ordinary playback remains available. */ }
  element.volume = state.volume;
  return element;
}
export function configureAudio(options: { rate?: number; volume?: number }) {
  const oldRate=state.rate;
  update({ rate: Number.isFinite(options.rate) ? Math.max(.5,Math.min(1.5,options.rate!)) : state.rate, volume: Number.isFinite(options.volume) ? Math.max(0,Math.min(1,options.volume!)) : state.volume });
  if (element) { element.playbackRate = state.rate; element.volume = state.volume; }
  try { localStorage.setItem(preferencesKey,JSON.stringify({rate:state.rate,volume:state.volume})); } catch { /* Playback works with storage disabled. */ }
  if(oldRate!==state.rate)restartSystemVoice?.();
}
let restartSystemVoice:(()=>void)|null=null;
export function pauseSpeech() {
  if (state.status !== 'playing') return;
  pauseWatchdog?.();
  if (state.source.startsWith('Системный')) speechSynthesis.pause();
  else element?.pause();
  update({status:'paused'});
}
export async function resumeSpeech() {
  if (state.status !== 'paused') return;
  const token = generation;
  try {
    if (state.source.startsWith('Системный')) speechSynthesis.resume();
    else {resumeWatchdog?.();if(context)await abortable(context.resume(),AbortSignal.timeout(2000)); if (token !== generation) return; if(element)await abortable(element.play(),AbortSignal.timeout(8000));}
    if (token === generation) {resumeWatchdog?.(); update({status:'playing'});}
  } catch { if(token === generation) {stopSpeech(); update({status:'error',error:'Не удалось продолжить звук. Повторите воспроизведение.'});} }
}
export function stopSpeech() {
  requestAbort?.abort();requestAbort=null;
  restartSystemVoice=null;
  pauseWatchdog = resumeWatchdog = null;
  clearSequence?.(); clearSequence = null;
  generation++;
  cancelPending?.(); cancelPending = null;
  if (element) { element.onended = element.onerror = element.onplaying = element.onpause = element.ontimeupdate = element.onwaiting = element.onstalled = null; element.pause(); element.removeAttribute('src'); element.load(); }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  update({ status: 'idle',error:'' });
}
async function playFile(url: string, token: number, source: string): Promise<boolean> {
  if (token !== generation) return false;
  const audio = player();
  return new Promise(resolve => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return; done = true; clearTimeout(timeout);
      audio.onended = audio.onerror = audio.onplaying = audio.onpause = audio.ontimeupdate = audio.onwaiting = audio.onstalled = null;
      pauseWatchdog = resumeWatchdog = null;
      cancelPending = null; if (!ok) audio.pause(); resolve(ok);
    };
    // A stalled request must not leave the lesson locked indefinitely.
    let timeout = setTimeout(() => finish(false), 8000);
    let lastTime=-1;
    pauseWatchdog = () => clearTimeout(timeout);
    resumeWatchdog = () => {clearTimeout(timeout);timeout=setTimeout(()=>finish(false),8000);};
    cancelPending = () => finish(false);
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    audio.onplaying = () => { if (token === generation) { resumeWatchdog?.();update({ status: 'playing', source }); } };
    audio.onpause = () => {if(token===generation&&!done&&audio.paused&&!audio.ended&&state.status==='playing'){pauseWatchdog?.();update({status:'paused'});}};
    audio.ontimeupdate = () => {if(audio.currentTime!==lastTime&&state.status!=='paused'){lastTime=audio.currentTime;resumeWatchdog?.();}};
    audio.src = url; audio.playbackRate = state.rate;
    audio.play().catch(error => {if(token===generation)playbackBlocked=error?.name==='NotAllowedError';finish(false);});
  });
}
async function systemVoice(text: string, token: number) {
  if (typeof speechSynthesis === 'undefined') return false;
  if (!speechSynthesis.getVoices().length) await new Promise<void>(resolve => {
    const done = () => { clearTimeout(timeout); speechSynthesis.removeEventListener('voiceschanged', done); resolve(); };
    const timeout = setTimeout(done, 600); speechSynthesis.addEventListener('voiceschanged', done);
  });
  if (token !== generation) return false;
  const voice = speechSynthesis.getVoices().find(v => /^bg(?:-|$)/i.test(v.lang) && (v.localService || navigator.onLine));
  if (!voice) return false;
  return new Promise<boolean>(resolve => {
    let utterance:SpeechSynthesisUtterance,offset=0,boundary=0;
    let finished = false;
    const done = (ok: boolean) => { if (finished) return; finished = true; clearTimeout(timeout);restartSystemVoice=null; pauseWatchdog = resumeWatchdog = null; cancelPending = null; resolve(ok); };
    let timeout:ReturnType<typeof setTimeout>;
    const arm=(ms=8000)=>{clearTimeout(timeout);timeout=setTimeout(()=>{done(false);speechSynthesis.cancel();},ms);};
    pauseWatchdog = () => clearTimeout(timeout);
    resumeWatchdog = () => arm(Math.max(15000,(text.length-offset)/6/state.rate*1000+12000));
    cancelPending = () => done(false);
    const start=()=>{
      utterance=new SpeechSynthesisUtterance(text.slice(offset));utterance.voice=voice;utterance.lang='bg-BG';utterance.rate=state.rate;utterance.volume=state.volume;
      utterance.onend=()=>done(true);utterance.onerror=()=>done(false);
      utterance.onboundary=e=>{boundary=offset+e.charIndex;};
      utterance.onstart=()=>{if(token===generation){update({status:'playing',source:'Системный голос bg-BG · сигнал недоступен'});resumeWatchdog?.();}};
      arm();try{speechSynthesis.speak(utterance);}catch{done(false);}
    };
    restartSystemVoice=()=>{
      const paused=state.status==='paused';
      utterance.onend=utterance.onerror=utterance.onstart=utterance.onboundary=null;
      speechSynthesis.cancel();offset=boundary;start();
      if(paused){speechSynthesis.pause();pauseWatchdog?.();update({status:'paused'});}
    };
    start();
  });
}
async function playServerAudio(text:string,url:string,token:number){
 const controller=new AbortController();const abort=()=>controller.abort();
 const signal=requestAbort?.signal;signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,12000);cancelPending=abort;
 let objectUrl:string|undefined;
 try{
  const response=await fetch('/api/tts?text='+encodeURIComponent(text),{signal:controller.signal});
  if(token!==generation||!response.ok||!response.headers.get('content-type')?.startsWith('audio/'))return false;
  const blob=await response.blob();clearTimeout(timer);
  objectUrl=URL.createObjectURL(blob);
  if(token!==generation)return false;
  const played=await playFile(objectUrl,token,'Болгарский · сервер Piper');
  if(played&&'caches' in globalThis){void(async()=>{try{const cache=await caches.open('chameleon-audio-playback-v2');await cache.put(url,new Response(blob,{headers:{'Content-Type':blob.type}}));const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-256)))await cache.delete(key);}catch{/* A quota error does not interrupt speech. */}})();}
  return played;
 }catch{return false;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);if(objectUrl)URL.revokeObjectURL(objectUrl);if(token===generation)cancelPending=null;}
}
async function playText(text: string, token: number, notify: (s: string) => void) {
  if(token!==generation||!requestAbort)return false;
  const signal=requestAbort.signal;
  try {
  update({ status: 'loading', text, source: '', error: '' });
  const preparedUrl = await abortable(assetUrl(text),signal);
  if(token!==generation)return false;
  let offline:string|undefined;
  try {if('caches' in globalThis){const blob=await abortable((async()=>{const response=await(await caches.open('chameleon-audio-offline-v1')).match(preparedUrl)??await(await caches.open('chameleon-audio-v1')).match(preparedUrl)??await(await caches.open('chameleon-audio-playback-v2')).match(preparedUrl);return response?.blob();})(),signal);if(blob&&token===generation)offline=URL.createObjectURL(blob);}}catch{/* Network/stream fallback stays available. */}
  if(token!==generation){if(offline)URL.revokeObjectURL(offline);return false;}
  let played=false;try{played=await playFile(offline??preparedUrl,token,'Болгарский · Piper');}finally{if(offline)URL.revokeObjectURL(offline);}
  if (played) { if (token === generation) update({ status: 'idle' }); return true; }
  if (token !== generation) return false;
  if(playbackBlocked)throw Error('Нажмите «Повторить звук», чтобы разрешить воспроизведение.');
  update({status:'loading',source:''});
  if (navigator.onLine && await playServerAudio(text,preparedUrl,token)) { if (token === generation) update({ status: 'idle' }); return true; }
  if (token !== generation) return false;
  if (await systemVoice(text, token)) { if (token === generation) update({ status: 'idle' }); return true; }
  throw Error('Для этой фразы озвучивание сейчас недоступно. Повторите загрузку звука.');
  } catch(failure) {
    if(token===generation&&!signal.aborted){const error=failure instanceof Error?failure.message:'Не удалось воспроизвести звук. Повторите попытку.';update({status:'error',error});notify(error);}
  }
  return false;
}
export function speak(text: string, notify: (s: string) => void, rate = state.rate) {
  stopSpeech(); configureAudio({ rate });player();requestAbort=new AbortController();playbackBlocked=false;
  return playText(text, generation, notify);
}
export async function speakSequence(texts: string[], notify: (s: string) => void, rate = state.rate, onLine?: (i: number) => void) {
  stopSpeech(); configureAudio({ rate }); player();requestAbort=new AbortController();playbackBlocked=false; const token = generation;
  clearSequence = () => onLine?.(-1);
  for (let i = 0; i < texts.length && token === generation; i++) {
    onLine?.(i); if (!await playText(texts[i], token, notify)) break;
  }
  // A stopped old sequence must not clear the highlight of a new sequence.
  if (token === generation) { clearSequence?.(); clearSequence = null; }
}
async function downloadAudio(url:string,signal?:AbortSignal){
  const controller=new AbortController(),abort=()=>controller.abort();
  const timer=setTimeout(abort,12000);signal?.addEventListener('abort',abort,{once:true});
  try{
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok)return response;
    const blob=await response.blob();return new Response(blob,{status:response.status,headers:response.headers});
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export async function cacheAudio(texts: string[], progress: (done: number, total: number) => void,signal?:AbortSignal) {
  if (!('caches' in globalThis)) throw Error('Офлайн-аудио доступно в защищённом контексте HTTPS или localhost.');
  const cache = await caches.open('chameleon-audio-offline-v1');
  const resolved=new Map<string,string>(),keys=new Map<string,Set<string>>();
  for(const text of new Set(texts)){const url=await abortable(assetUrl(text),signal??AbortSignal.timeout(8000));if(!resolved.has(url))resolved.set(url,text);if(!keys.has(url))keys.set(url,new Set());keys.get(url)!.add(lookupKey(text));}
  const urls=[...resolved.keys()];let done=0;
  for (const url of urls) {
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    if (!await cache.match(url)) {
      let r = await downloadAudio(url,signal);
      if (!r.ok && navigator.onLine) {
        const text = resolved.get(url);
        if (text) r = await downloadAudio('/api/tts?text=' + encodeURIComponent(text),signal);
      }
      if (!r.ok || !r.headers.get('content-type')?.startsWith('audio/')) throw Error('Не удалось загрузить аудиофайл. Повторите загрузку.');
      await cache.put(url, r);
    }
    for(const key of keys.get(url)??[])await cache.put(offlineKey(key),new Response(url,{headers:{'Content-Type':'text/plain'}}));
    progress(++done, urls.length);
  }
}

if(import.meta.hot)import.meta.hot.dispose(()=>{stopSpeech();void context?.close();listeners.clear();});
