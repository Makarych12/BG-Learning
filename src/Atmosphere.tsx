import { profileRuntime, currentRuntimeProfile } from "./performance";
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { Volume2, Square, RotateCcw, X } from 'lucide-react';
import { audioState, subscribeAudio, audioAnalyser, configureAudio, speak, stopSpeech } from './speech';

/** Global interactions share one set of delegated listeners and stop offscreen. */
export function Atmosphere({ reduced }: { reduced: boolean }) {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tweens=new Set<gsap.core.Tween>();
    const track=(t:gsap.core.Tween)=>{tweens.add(t);const done=t.eventCallback('onComplete');t.eventCallback('onComplete',()=>{tweens.delete(t);done?.();});return t;};
    const root = layer.current;
    if (!root) return;
    const cleaners=new Set<()=>void>();
    const finishProfile = profileRuntime();
    const visibility = () => { root.classList.toggle('paused', document.hidden); root.parentElement?.classList.toggle('inactive', document.hidden); };
    document.addEventListener('visibilitychange', visibility);visibility();
    const hardware = navigator as Navigator & { deviceMemory?:number };
    const economy = matchMedia('(max-width: 760px), (pointer: coarse)').matches || (hardware.deviceMemory !== undefined && hardware.deviceMemory <= 4) || (hardware.hardwareConcurrency > 0 && hardware.hardwareConcurrency <= 4);
    root.parentElement?.classList.toggle('economy',economy);
    const media = gsap.matchMedia();
    const adapt = () => { const sample=currentRuntimeProfile(); if(sample && sample.frames>=30 && (sample.observedFps < 40 || sample.p95FrameMs > 45)){root.parentElement?.classList.add('economy');media.revert();} };
    window.addEventListener('chameleon-profile',adapt);
    media.add('(prefers-reduced-motion: no-preference) and (min-width: 761px) and (hover: hover)', () => {
      if (reduced || economy) return;
      const waves = gsap.utils.toArray<HTMLElement>('.aurora-wave', root);
      const move = waves.map((w, i) => ({ x: gsap.quickTo(w, 'x', { duration: 1.8 + i * .3 }), y: gsap.quickTo(w, 'y', { duration: 2 + i * .3 }) }));
      const active = new Map<HTMLElement, { x: ReturnType<typeof gsap.quickTo>; y: ReturnType<typeof gsap.quickTo> }>();
      let previous: HTMLElement | null = null,bounds:DOMRect|null=null;
      const prune=()=>{for(const [card,t] of active)if(!card.isConnected){t.x.tween.kill();t.y.tween.kill();active.delete(card);if(previous===card){previous=null;bounds=null;}}};
      cleaners.add(prune);
      let frame = 0, pending: {x:number;y:number;target:Element}|null = null;
      const draw = () => {
        frame=0;
        if(document.hidden || !pending)return;
        const e=pending, nx=e.x/innerWidth-.5, ny=e.y/innerHeight-.5;
        move.forEach((m,i)=>{m.x(nx*(35+i*45));m.y(ny*(25+i*30)-Math.min(scrollY,4000)*(.015+i*.025));});
        // Mix light planes through opacity: avoid a viewport-sized hue filter repaint.
        waves[1].style.opacity=String(.18+(nx+.5)*.12);
        const source=e.target.closest<HTMLElement>('.flashcard, .photo-card, .corpus-catalog-item');
        const card=source?.matches('.flashcard')?source.closest<HTMLElement>('.flashcard-area'):source;
        if(previous!==card)bounds=null;
        if(previous&&previous!==card){const old=active.get(previous);old?.x(0);old?.y(0);}
        previous=card;
        if(!card||!card.isConnected)return;
        const r=bounds??(bounds=card.getBoundingClientRect());if(!r.width||!r.height)return;const x=(e.x-r.left)/r.width,y=(e.y-r.top)/r.height;
        card.style.setProperty('--light-x',`${x*100}%`);card.style.setProperty('--light-y',`${y*100}%`);
        let tilt=active.get(card);
        if(!tilt){tilt={x:gsap.quickTo(card,'rotationX',{duration:.55}),y:gsap.quickTo(card,'rotationY',{duration:.55})};active.set(card,tilt);if(active.size>8){const oldest=active.keys().next().value!;const old=active.get(oldest)!;old.x.tween.kill();old.y.tween.kill();gsap.set(oldest,{clearProps:'transform'});active.delete(oldest);}}
        tilt.x((.5-y)*7);tilt.y((x-.5)*9);
      };
      const pointer=(e:PointerEvent)=>{pending={x:e.clientX,y:e.clientY,target:e.target as Element};if(!frame)frame=requestAnimationFrame(draw);};
      const reset=()=>{if(previous){const v=active.get(previous);v?.x(0);v?.y(0);}previous=null;bounds=null;};
      const leave=(e:PointerEvent)=>{if(previous&&(!(e.relatedTarget instanceof Node)||!previous.contains(e.relatedTarget)))reset();};
      const scroll=()=>{bounds=null;if(pending&&!frame)frame=requestAnimationFrame(draw);};
      window.addEventListener('resize',scroll);
      window.addEventListener('scroll', scroll, { passive: true });
      window.addEventListener('pointermove', pointer, { passive: true });
      document.addEventListener('pointerout', leave, { passive: true });
      window.addEventListener('blur', reset);
      return () => {cleaners.delete(prune); cancelAnimationFrame(frame);window.removeEventListener('resize',scroll); window.removeEventListener('scroll', scroll); window.removeEventListener('pointermove', pointer); document.removeEventListener('pointerout', leave); window.removeEventListener('blur', reset); for(const [card,t] of active){t.x.tween.kill();t.y.tween.kill();gsap.set(card,{clearProps:'transform'});}active.clear(); };
    });
    const press = (e: PointerEvent) => {
      if (reduced || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const button = (e.target as Element).closest<HTMLElement>('button');
      if (!button || button.hasAttribute('disabled')) return;
      const box = button.getBoundingClientRect(), dot = document.createElement('i');
      dot.className = 'neon-ripple'; dot.setAttribute('aria-hidden', 'true');
      dot.style.left = `${e.clientX-box.left}px`; dot.style.top = `${e.clientY-box.top}px`;
      button.appendChild(dot);
      track(gsap.fromTo(dot, { scale: 0, opacity: .8 }, { scale: Math.max(box.width, box.height)/12, opacity: 0, duration: .65, onComplete: () => dot.remove() }));
    };
    document.addEventListener('pointerdown', press, { passive: true });
    const animated=new Set<Element>();
    const viewport=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{for(const entry of entries)entry.target.classList.toggle('offscreen-motion',!entry.isIntersecting);},{rootMargin:'80px'});
    const observe=(item:Element)=>{if(item.matches('.chameleon,.audio-orb')&&!animated.has(item)){animated.add(item);viewport?.observe(item);}};
    document.querySelectorAll('.chameleon,.audio-orb').forEach(observe);
    const seen = new WeakSet<Element>();
    const effects = new MutationObserver(records => {
      for(const clean of cleaners)clean();
      for(const item of animated)if(!item.isConnected){viewport?.unobserve(item);animated.delete(item);}
      for(const record of records)for(const node of record.addedNodes)if(node instanceof HTMLElement){observe(node);node.querySelectorAll(".chameleon,.audio-orb").forEach(observe);}
      if (reduced || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      for (const record of records) for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const items = [node, ...node.querySelectorAll('.answer-feedback, .success-orb, .feedback-correct, .feedback-wrong')];
        for (const item of items) {
          if (seen.has(item)) continue;
          if (item.matches('.answer-feedback.good, .feedback-correct, .success-orb')) {
            seen.add(item); track(gsap.fromTo(item, { scale: .9, opacity: .5 }, { scale: 1, opacity: 1, duration: .65, ease: 'back.out(2)' }));
            const ring = document.createElement('i'); ring.className = 'success-ring'; ring.setAttribute('aria-hidden', 'true'); item.appendChild(ring);
            track(gsap.to(ring, { scale: 2.2, opacity: 0, duration: .85, onComplete: () => ring.remove() }));
          } else if (item.matches('.answer-feedback.bad, .feedback-wrong')) {
            seen.add(item); track(gsap.fromTo(item, { x: -7 }, { x: 0, duration: .08, repeat: 5, yoyo: true, onComplete: () => gsap.set(item, { x: 0 }) }));
          }
        }
      }
    });
    effects.observe(document.body, { childList: true, subtree: true });
    return () => {for(const t of tweens)t.kill();tweens.clear();document.querySelectorAll('.neon-ripple,.success-ring').forEach(el=>el.remove());finishProfile(); window.removeEventListener("chameleon-profile",adapt); media.revert(); document.removeEventListener('visibilitychange', visibility);viewport?.disconnect();animated.clear(); effects.disconnect(); document.removeEventListener('pointerdown', press); };
  }, [reduced]);
  return <div className={`aurora-scene ${reduced ? 'still' : ''}`} aria-hidden="true" ref={layer}><div className="aurora-wave wave-one"/><div className="aurora-wave wave-two"/><div className="aurora-wave wave-three"/><div className="aurora-mesh"/><div className="aurora-grain"/></div>;
}

export function AudioDock({ reduced = false }: { reduced?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const state = useSyncExternalStore(subscribeAudio, audioState);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current, ctx = el?.getContext('2d');
    if (!el || !ctx || state.status !== 'playing' || state.source.includes('Системный') || reduced || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const data = new Uint8Array(64),colors=Array.from({length:32},(_,i)=>`hsl(${155+i*3} 85% 73%)`);
    const draw = () => {
      if (document.hidden) return;
      const analyser = audioAnalyser(); ctx.clearRect(0, 0, 240, 40);
      if (analyser && !state.source.includes('Системный')) {
        analyser.getByteFrequencyData(data);
        for (let i=0;i<32;i++) { const height = data[i+2]/255*36; ctx.fillStyle = colors[i]; ctx.fillRect(i*7.5, 20-height/2, 4, Math.max(1,height)); }
      }
      frame = requestAnimationFrame(draw);
    };
    const resume = () => { if (!document.hidden) { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); } };
    document.addEventListener('visibilitychange', resume); frame = requestAnimationFrame(draw); return () => { document.removeEventListener('visibilitychange', resume); cancelAnimationFrame(frame); ctx.clearRect(0,0,240,40); };
  }, [state.status, state.source, reduced, dismissed]);
  useEffect(() => { if (state.status === "loading") setDismissed(false); }, [state.status]);
  if (!state.text || dismissed) return null;
  return <aside className={`audio-dock ${state.status}`} aria-label="Управление звуком">
    <div className="audio-dock-title"><Volume2 size={16}/><span role="status">{state.status === 'loading' ? 'Загружаем звук…' : state.status === 'error' ? 'Не удалось загрузить звук' : state.status === 'playing' ? state.source : 'Аудио готово'}</span><button aria-label="Закрыть проигрыватель" onClick={() => { stopSpeech(); setDismissed(true); }}><X size={14}/></button></div>
    <p lang="bg">{state.text}</p><canvas ref={canvas} width={240} height={40} aria-label="Спектр реального аудиосигнала"/>
    <div className="audio-dock-controls"><button onClick={() => speak(state.text, () => {})} aria-label="Повторить звук"><RotateCcw size={16}/></button><button onClick={stopSpeech} aria-label="Остановить звук"><Square size={14}/></button><label>Темп<select aria-label="Скорость аудио" value={state.rate} onChange={e=>configureAudio({rate:+e.target.value})}>{[.55,.65,.7,.85,1,1.15,1.3].map(v=><option key={v} value={v}>{(v/.85).toFixed(1)}×</option>)}</select></label><label>Звук<input aria-label="Громкость аудио" type="range" min="0" max="1" step=".05" value={state.volume} onChange={e=>configureAudio({volume:+e.target.value})}/></label></div>
    {state.error && <small>{state.error}</small>}
  </aside>;
}
