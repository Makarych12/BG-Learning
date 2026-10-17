/** One Bulgarian playback pipeline. Recorded/synthesized assets → server → real bg voice. */
export const normalizeAudioText = (text: string) => text.normalize('NFC').replace(/ѝ/g, '\ue000').normalize('NFD').replace(/[\u0300\u0301]/g, '').normalize('NFC').replace(/\ue000/g, 'ѝ').replace(/\s+/gu, ' ').trim().replace(/[.!?…]+$/u, '').toLocaleLowerCase('bg');
export function audioKey(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash.toString(16).padStart(8, '0');
}
type State = { status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'; text: string; source: string; error: string; rate: number; volume: number };
let state: State = { status: 'idle', text: '', source: '', error: '', rate: .85, volume: .85 };
const listeners = new Set<() => void>();
export const audioState = () => state;
export const subscribeAudio = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const update = (change: Partial<State>) => { state = { ...state, ...change }; listeners.forEach(fn => fn()); };
let element: HTMLAudioElement | null = null, context: AudioContext | null = null, analyser: AnalyserNode | null = null, gain: GainNode | null = null;
let normalizationTimer: ReturnType<typeof setInterval> | null = null;
let clearSequence: (()=>void) | null = null;
let pauseWatchdog: (() => void) | null = null, resumeWatchdog: (() => void) | null = null;
let generation = 0, cancelPending: (() => void) | null = null;
const aliases=new Map<string,Promise<Record<string,string>>>();
export function prepareAudio(text?:string):Promise<Record<string,string>> {
  if(!text)return Promise.resolve({});
  const prefix=audioKey(text).slice(0,2),url='/audio/lookup/'+prefix+'.json';
  const cached=aliases.get(prefix);if(cached){aliases.delete(prefix);aliases.set(prefix,cached);return cached;}
  const request=fetch(url,{signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>{aliases.delete(prefix);return {};});
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
  // Must run in the original user gesture, before any await (iOS).
  try {
    if (!context && typeof AudioContext !== 'undefined') {
      context = new AudioContext();
      const input = context.createMediaElementSource(element);
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -22; compressor.knee.value = 18; compressor.ratio.value = 3;
      gain = context.createGain(); gain.gain.value = state.volume;
      analyser = context.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .75;
      input.connect(analyser).connect(gain).connect(compressor).connect(context.destination);
    }
    void context?.resume().catch(() => {});
  } catch { /* Browser without Web Audio: ordinary playback remains available. */ }
  element.volume = gain ? 1 : state.volume;
  return element;
}
export function configureAudio(options: { rate?: number; volume?: number }) {
  update({ rate: Math.max(.45, Math.min(1.3, options.rate ?? state.rate)), volume: Math.max(0, Math.min(1, options.volume ?? state.volume)) });
  if (element) { element.playbackRate = state.rate / .85; element.volume = gain ? 1 : state.volume; }
  if (gain) gain.gain.value = state.volume;
}
function stopNormalization() {
  if (normalizationTimer) clearInterval(normalizationTimer);
  normalizationTimer = null;
}
function normalizeVolume() {
  stopNormalization();
  if (!analyser || !gain || !context) return;
  const samples = new Float32Array(analyser.fftSize);
  normalizationTimer = setInterval(() => {
    if (!analyser || !gain || !context || document.hidden) return;
    analyser.getFloatTimeDomainData(samples);
    const rms = Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length);
    // Do not amplify silence or quiet breath; bounded gain, smooth attack/release.
    if (rms > .025) gain.gain.setTargetAtTime(state.volume * Math.max(.55,Math.min(1.8,.14/rms)), context.currentTime, .16);
  },120);
}
export function pauseSpeech() {
  if (state.status !== 'playing') return;
  pauseWatchdog?.(); stopNormalization();
  if (state.source.startsWith('Системный')) speechSynthesis.pause();
  else element?.pause();
  update({status:'paused'});
}
export async function resumeSpeech() {
  if (state.status !== 'paused') return;
  const token = generation;
  try {
    if (state.source.startsWith('Системный')) speechSynthesis.resume();
    else { await context?.resume(); if (token !== generation) return; await element?.play(); }
    if (token === generation) {resumeWatchdog?.(); update({status:'playing'}); normalizeVolume();}
  } catch { if(token === generation) {stopSpeech(); update({status:'error',error:'Не удалось продолжить звук. Повторите воспроизведение.'});} }
}
export function stopSpeech() {
  stopNormalization();
  pauseWatchdog = resumeWatchdog = null;
  clearSequence?.(); clearSequence = null;
  generation++;
  cancelPending?.(); cancelPending = null;
  if (element) { element.onended = element.onerror = element.onplaying = null; element.pause(); element.removeAttribute('src'); element.load(); }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  update({ status: 'idle' });
}
async function playFile(url: string, token: number, source: string): Promise<boolean> {
  if (token !== generation) return false;
  const audio = player();
  return new Promise(resolve => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return; done = true; clearTimeout(timeout); stopNormalization();
      audio.onended = audio.onerror = audio.onplaying = null;
      pauseWatchdog = resumeWatchdog = null;
      cancelPending = null; if (!ok) audio.pause(); resolve(ok);
    };
    // A stalled request must not leave the lesson locked indefinitely.
    let timeout = setTimeout(() => finish(false), 90000);
    pauseWatchdog = () => clearTimeout(timeout);
    resumeWatchdog = () => {clearTimeout(timeout);timeout=setTimeout(()=>finish(false),90000);};
    cancelPending = () => finish(false);
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    audio.onplaying = () => { if (token === generation) { normalizeVolume(); update({ status: 'playing', source }); } };
    audio.src = url; audio.playbackRate = state.rate / .85;
    audio.play().catch(() => finish(false));
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
    const utterance = new SpeechSynthesisUtterance(text); utterance.voice = voice; utterance.lang = 'bg-BG'; utterance.rate = state.rate; utterance.volume = state.volume;
    let finished = false;
    const done = (ok: boolean) => { if (finished) return; finished = true; clearTimeout(timeout); pauseWatchdog = resumeWatchdog = null; cancelPending = null; resolve(ok); };
    let timeout = setTimeout(() => { speechSynthesis.cancel(); done(false); }, 90000);
    pauseWatchdog = () => clearTimeout(timeout);
    resumeWatchdog = () => {clearTimeout(timeout);timeout=setTimeout(()=>{speechSynthesis.cancel();done(false);},90000);};
    cancelPending = () => done(false);
    utterance.onend = () => done(true); utterance.onerror = () => done(false);
    utterance.onstart = () => { if (token === generation) update({ status: 'playing', source: 'Системный голос bg-BG · сигнал недоступен' }); };
    speechSynthesis.speak(utterance);
  });
}
async function playServerAudio(text:string,url:string,token:number){
 const controller=new AbortController();cancelPending=()=>controller.abort();
 let objectUrl:string|undefined;
 try{
  const response=await fetch('/api/tts?text='+encodeURIComponent(text),{signal:controller.signal});
  if(token!==generation||!response.ok||!response.headers.get('content-type')?.startsWith('audio/'))return false;
  const saved=response.clone();
  objectUrl=URL.createObjectURL(await response.blob());
  if(token!==generation)return false;
  const played=await playFile(objectUrl,token,'Болгарский · сервер Piper');
  if(played&&'caches' in globalThis){try{const cache=await caches.open('chameleon-audio-playback-v2');await cache.put(url,saved);const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-256)))await cache.delete(key);}catch{/* A quota error does not interrupt speech. */}}
  return played;
 }catch{return false;}finally{if(objectUrl)URL.revokeObjectURL(objectUrl);if(token===generation)cancelPending=null;}
}
async function playText(text: string, token: number, notify: (s: string) => void) {
  update({ status: 'loading', text, source: '', error: '' });
  const preparedUrl = await assetUrl(text);
  let offline:string|undefined;
  try {if('caches' in globalThis){const response=await(await caches.open('chameleon-audio-offline-v1')).match(preparedUrl)??await(await caches.open('chameleon-audio-v1')).match(preparedUrl)??await(await caches.open('chameleon-audio-playback-v2')).match(preparedUrl);if(response)offline=URL.createObjectURL(await response.blob());}}catch{/* Network/stream fallback stays available. */}
  if(token!==generation){if(offline)URL.revokeObjectURL(offline);return false;}
  let played=false;try{played=await playFile(offline??preparedUrl,token,'Болгарский · Piper');}finally{if(offline)URL.revokeObjectURL(offline);}
  if (played) { if (token === generation) update({ status: 'idle' }); return true; }
  if (token !== generation) return false;
  if (navigator.onLine && await playServerAudio(text,preparedUrl,token)) { if (token === generation) update({ status: 'idle' }); return true; }
  if (token !== generation) return false;
  if (await systemVoice(text, token)) { if (token === generation) update({ status: 'idle' }); return true; }
  if (token === generation) { const error = 'Для этой фразы озвучивание сейчас недоступно. Повторите загрузку звука.'; update({ status: 'error', error }); notify(error); }
  return false;
}
export function speak(text: string, notify: (s: string) => void, rate = state.rate) {
  stopSpeech(); configureAudio({ rate }); player();
  void playText(text, generation, notify);
}
export async function speakSequence(texts: string[], notify: (s: string) => void, rate = state.rate, onLine?: (i: number) => void) {
  stopSpeech(); configureAudio({ rate }); player(); const token = generation;
  clearSequence = () => onLine?.(-1);
  for (let i = 0; i < texts.length && token === generation; i++) {
    onLine?.(i); if (!await playText(texts[i], token, notify)) break;
  }
  // A stopped old sequence must not clear the highlight of a new sequence.
  if (token === generation) { clearSequence?.(); clearSequence = null; }
}
export async function cacheAudio(texts: string[], progress: (done: number, total: number) => void) {
  if (!('caches' in globalThis)) throw Error('Офлайн-аудио доступно в защищённом контексте HTTPS или localhost.');
  const cache = await caches.open('chameleon-audio-offline-v1');
  const resolved=new Map<string,string>(),keys=new Map<string,Set<string>>();
  for(const text of new Set(texts)){const url=await assetUrl(text);if(!resolved.has(url))resolved.set(url,text);if(!keys.has(url))keys.set(url,new Set());keys.get(url)!.add(lookupKey(text));}
  const urls=[...resolved.keys()];let done=0;
  for (const url of urls) {
    if (!await cache.match(url)) {
      let r = await fetch(url);
      if (!r.ok && navigator.onLine) {
        const text = resolved.get(url);
        if (text) r = await fetch('/api/tts?text=' + encodeURIComponent(text));
      }
      if (!r.ok || !r.headers.get('content-type')?.startsWith('audio/')) throw Error('Не удалось загрузить аудиофайл. Повторите загрузку.');
      await cache.put(url, r);
    }
    for(const key of keys.get(url)??[])await cache.put(offlineKey(key),new Response(url,{headers:{'Content-Type':'text/plain'}}));
    progress(++done, urls.length);
  }
}
