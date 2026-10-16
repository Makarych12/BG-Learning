import { railReviewReason } from "./content-quality";
import { railCorrections } from "./rail-corrections";
import { railTerms } from './railway';
import { professionalDialogues } from './rail-conversations';
import { db, shuffle, normalizeAnswer } from './storage';
import type { Task, Mechanic } from './library';
import {railSections,type RailSection} from './rail-sections';
export {railSections,type RailSection} from './rail-sections';
export type RailTask = Task & { materialId: string };
const unique = <T,>(rows:T[], key:(t:T)=>string) => [...new Map(rows.map(t=>[key(t),t])).values()];
const conditionTopic = /ремонт|диагност|обслуж|измер|неисправ|контрол|безопас|инструмент|дефект/i;
const communicationTopic = /документ|персонал|общени|организац|движение|связь/i;
const banks=new Map<RailSection,RailTask[]>();
const choicePools=new WeakMap<RailTask[],string[]>();
export function railwayBank(section: RailSection): RailTask[] {
  const cached=banks.get(section);if(cached)return cached;
  const terms = railTerms.filter(t=>!railReviewReason(t)).filter(t => section === 'condition' ? conditionTopic.test(t.topic) : section === 'communication' ? communicationTopic.test(t.topic) : !conditionTopic.test(t.topic) && !communicationTopic.test(t.topic));
  const tasks: RailTask[] = [];
  const meanings=unique(terms,t=>t.ru).map(t=>t.ru);
  const meaningIndex=new Map(meanings.map((ru,i)=>[ru,i]));
  const skill=railSections.find(s=>s.id===section)!.title;
  for (const t of terms) {
    const common = {materialId:t.id, wordId:t.id, source:t.source, sourceLabel:'Тематический источник; перевод — учебная редакция', explanation:`${t.bg} — ${t.ru}. ${t.topic}.`, skill:skill,level:'B2'};
    for (const type of ['technical','meaning','dictation'] as const) tasks.push({...common,id:`rail-bank-${type}-${t.id}`,type,prompt:type==='technical'?`Восстановите термин словаря: ${t.ru}`:type==='meaning'?`Выберите значение термина «${t.bg}»`:'Запишите услышанный термин.',bg:type==='dictation'?t.bg:undefined,answers:[type==='meaning'?t.ru:t.bg],options:type==='meaning'?Array.from({length:Math.min(4,meanings.length)},(_,i)=>meanings[(meaningIndex.get(t.ru)!+i)%meanings.length]):undefined});
  }
  // Each dialogue keeps its real context; no invented operating orders.
  const scenes = section === 'equipment' ? professionalDialogues.filter(d=>/motor|contactor|relay|transformer|pantograph|bogie/.test(d.id)) : section==='condition' ? professionalDialogues.filter(d=>!/training|handover|briefing/.test(d.id)) : professionalDialogues;
  for (const d of scenes) for (let i=0;i<d.lines.length;i++) {
    const line=d.lines[i], materialId=`rail-line-${d.id}-${i}`;
    for(const type of ['translate-ru','translate-bg','order','dictation',...(i%2?['dialogue']:[])] as Mechanic[]) {
      const context=d.lines.slice(Math.max(0,i-2),i).map(l=>`${l.speaker}: ${l.bg}`).join('\n');
      tasks.push({id:`${materialId}-${type}`,materialId,type,prompt:type==='dialogue'?`${d.title}. Восстановите ответ по переводу: ${line.ru}`:type==='translate-ru'?'Восстановите болгарский текст по переводу.':type==='translate-bg'?'Воспроизведите русский перевод учебной реплики.':type==='order'?'Соберите исходную реплику. Другой порядок слов может быть грамматически допустим.':'Запишите услышанную реплику.',bg:type==='dialogue'?context:line.bg,ru:line.ru,answers:[type==='translate-bg'?line.ru:line.bg],options:type==='order'?line.bg.replace(/[.,!?;:„“"—]/g,'').split(/\s+/):undefined,source:'/sources/professional-contexts.html',sourceLabel:'Авторские профессиональные диалоги',explanation:`${line.bg}\n${line.ru}\nСитуация: ${d.title}. Проверяется исходная реплика; свободные переводы могут отличаться.`,skill:skill,level:'B2'});
    }
  }
  for(const [i,[wrong,bg,ru,rule]] of railCorrections[section].entries())tasks.push({id:`rail-correction-${section}-${i}`,materialId:`rail-correction-${section}-${i}`,type:'correction',prompt:`Исправьте грамматическую ошибку: ${wrong}`,answers:[bg],explanation:`${rule} ${bg} — ${ru}`,skill:'Профессиональная грамматика',level:'B1'});
  const bank=unique(tasks,t=>`${t.type}:${normalizeAnswer(t.type==='translate-bg'?t.bg??'':t.answers[0])}`);
  banks.set(section,bank);choicePools.set(bank,meanings);return bank;
}
/** Fresh material first, then failed material, then oldest successes. Never repeat a material in one session. */
export function selectRailSession(bank:RailTask[], count:number, attempts:{exerciseId:string;correct:boolean;at:number}[], mode:Mechanic|'mixed'='mixed'):RailTask[] {
  if(count<=0)return [];
  const latest=new Map<string,{correct:boolean;at:number}>();
  for(const a of attempts){const old=latest.get(a.exerciseId);if(!old||a.at>old.at)latest.set(a.exerciseId,a);}
  const materialHistory=new Map<string,{correct:boolean;at:number}>();
  for(const t of bank){const a=latest.get(t.id)??(t.wordId?latest.get(`term-${t.wordId}`):undefined),old=materialHistory.get(t.materialId);if(a&&(!old||a.at>old.at))materialHistory.set(t.materialId,a);}
  const rank=(t:RailTask)=>{const a=materialHistory.get(t.materialId);return !a?0:!a.correct?1:2;};
  const pool=shuffle(bank.filter(t=>mode==='mixed'||t.type===mode));
  if(materialHistory.size)pool.sort((a,b)=>rank(a)-rank(b)||(rank(a)===2?(materialHistory.get(a.materialId)?.at??0)-(materialHistory.get(b.materialId)?.at??0):0));
  const seen=new Set<string>(),result:RailTask[]=[];
  // Reserve at most a quarter for previous errors without crowding out new material.
  const failed=materialHistory.size?pool.filter(t=>materialHistory.get(t.materialId)?.correct===false).slice(0,Math.floor(count/4)):[];
  for(const t of [...failed,...pool]){if(seen.has(t.materialId))continue;seen.add(t.materialId);result.push(t);if(result.length>=count)break;}
  const choices=choicePools.get(bank);
  return shuffle(result).map(t=>{
    if(t.type==='meaning'&&choices)return {...t,options:shuffle([t.answers[0],...distractors(choices,t.answers[0])])};
    return t.options?{...t,options:shuffle(t.options)}:t;
  });
}
export async function railwaySession(section:RailSection,count=15,mode:Mechanic|'mixed'='mixed') {
  return selectRailSession(railwayBank(section),count,await db.attempts.where('exerciseId').startsWith('rail-').or('exerciseId').startsWith('term-').toArray(),mode);
}

function distractors(choices:string[],answer:string){
 const result:string[]=[],used=new Set([answer]),count=Math.min(3,choices.length-1);
 for(let attempt=0;attempt<12&&result.length<count;attempt++){const value=choices[Math.floor(Math.random()*choices.length)];if(!used.has(value)){used.add(value);result.push(value);}}
 if(result.length<count)for(const value of choices){if(!used.has(value)){used.add(value);result.push(value);}if(result.length>=count)break;}
 return result;
}
