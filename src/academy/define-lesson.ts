import type {LessonUnit} from '../grammar-units';
import type {Task} from '../library';
type Practice = [Task['type'],string,string,string,string?];
export type LessonDraft = {
 workshop?:LessonUnit['workshop'];
 id:string;level:'C1'|'C2';title:string;rule:string;formation:string;contrast:string;
 examples:string[];reading:[string,string,string];dialogue:string[];practice:Practice[];
 audio:[string,string,string,string,string?][];
};
/** Only structure is shared: texts, examples and assessment items are authored per lesson. */
export function defineLesson(d:LessonDraft):LessonUnit {
 const examples=d.examples.map(line=>{const [bg,ru]=line.split('|');return {bg,ru};});
 const conversation=d.dialogue.map(line=>{const [speaker,bg,ru]=line.split('|');return {speaker,bg,ru};});
 const task=(type:Task['type'],id:string,prompt:string,answer:string,explanation:string,options?:string,bg?:string):Task=>({
  id:`${d.id}-${id}`,type,prompt,answers:[answer],explanation,skill:d.title,level:d.level,
  options:type==='order'?answer.split(' '):options?.split('|'),bg,
 });
 return {id:d.id,level:d.level,title:d.title,workshop:d.workshop,rule:d.rule,formation:d.formation,contrast:d.contrast,examples,conversation,reading:{title:d.reading[0],bg:d.reading[1],ru:d.reading[2]},source:'/sources/advanced-lessons.html',tasks:[
  ...d.practice.map(([type,prompt,answer,explanation,options],i)=>task(type,`practice-${i}`,prompt,answer,explanation,options,type==='reading'?d.reading[1]:undefined)),
  ...examples.slice(0,3).map((e,i)=>task('translate-ru',`translate-${i}`,`Передайте по-болгарски: ${e.ru}`,e.bg,`Модель формулировки: ${e.bg}`)),
  ...conversation.filter((_,i)=>i%2===1).map((line,i)=>task('dialogue',`reply-${i}`,`Ответьте собеседнику (${line.speaker}): ${line.ru}`,line.bg,`Предыдущая реплика: ${conversation[i*2].ru}`,undefined,conversation[i*2].bg)),
  ...d.audio.map(([bg,ru,prompt,answer,options],i)=>task(options?'listen-choice':'dictation',`audio-${i}`,prompt,answer,ru,options,bg)),
 ].map((t,i)=>t.options&&t.type!=='order'?{...t,options:t.options.map((_,j,all)=>all[(i+j)%all.length])}:t)};
}
