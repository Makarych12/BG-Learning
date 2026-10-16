import { useEffect,useRef,useState } from 'react';
import {railSections} from './rail-sections';
import {railCounts,railSession,releaseRailEngine,type RailCounts} from './rail-engine';
import {finishNavigation} from './performance-metrics';
import type { Task, Mechanic } from './library';
export default function RailAcademy({launch,notify}:{launch:(tasks:Task[])=>Promise<void>;notify:(s:string)=>void}) {
 const [mode,setMode]=useState<Mechanic|'mixed'>('mixed'),[busy,setBusy]=useState(false);
 const [counts,setCounts]=useState<RailCounts>([]),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;releaseRailEngine();};},[]);
 useEffect(()=>{let current=true;setCounts([]);void railCounts(mode).then(rows=>{if(current){setCounts(rows);finishNavigation('railway','banks');}}).catch(()=>{if(current)notify('Не удалось подготовить банк. Повторите открытие раздела.');});return()=>{current=false;};},[mode,notify]);

 return <section id="rail-academy-banks"><h2>Практика по специальности</h2><p>Новая подборка из всей темы, с учётом предыдущих ошибок. Один материал встречается в занятии один раз.</p><select aria-label="Режим Railway Academy" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}>{([['mixed','Смешанное занятие'],['technical','Термины RU → BG'],['meaning','Распознавание терминов'],['translate-ru','Реплики RU → BG'],['translate-bg','Реплики BG → RU'],['order','Составление предложений'],['dictation','Аудирование'],['dialogue','Профессиональные диалоги'],['correction','Исправление ошибок']] as const).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select><div className="rail-topic-grid">{railSections.map((s,i)=><button key={s.id} className="panel topic-card" disabled={busy||!counts[i]?.tasks} onClick={async()=>{setBusy(true);try{const tasks=await railSession(s.id,15,mode);if(alive.current)await launch(tasks);}catch{if(alive.current)notify('Не удалось открыть занятие. Ваш прогресс сохранён.');}finally{setBusy(false);}}}><h3>{s.title}</h3><p>{counts[i]?`${counts[i].tasks} заданий · ${counts[i].materials} материалов`:'Подготавливаем банк…'}</p><span>Начать занятие →</span></button>)}</div></section>;
}
