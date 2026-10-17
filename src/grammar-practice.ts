import { verbReviewReason } from './verb-review';
import {jsonResource} from "./json-resource";
import { verbParadigms, paradigm } from './verb-forms';
import { grammarUnits } from './grammar-units';
import { db, shuffle } from './storage';
import type { Task, Mechanic } from './library';
import type { Level } from './content';
const levels=['A1','A2','B1','B2','C1','C2'];
export async function verbTasks(level:Level,count=12,selectedTense?:number,type:Mechanic='conjugation'):Promise<Task[]> {
 const recent=new Set((await db.attempts.orderBy('at').reverse().limit(500).toArray()).map(a=>a.exerciseId));
 const tenses=selectedTense===undefined?grammarUnits.slice(0,9).map((u,i)=>({u,i})).filter(({u})=>levels.indexOf(u.level)<=levels.indexOf(level)).map(({i})=>i):[selectedTense];
 const result:Task[]=[];
 for(const v of await practiceVerbs(count)) {
  const tense=shuffle(tenses)[0],person=Math.floor(Math.random()*6),compound=[3,4,7,8].includes(tense),gender=compound?shuffle(['m','f','n'])[0]:'m',form=shuffle(level==='A1'?['positive','negative']:['positive','negative','question'])[0],bg=paradigm(v,tense,person,gender,form);
  const id=`source-verb-${v.bg}-${tense}-${person}-${gender}-${form}-${type}`;
  if(recent.has(id))continue;
  if(type==='tense'&&Array.from({length:9},(_,i)=>i).some(other=>other!==tense&&paradigm(v,other,person,gender,form)===bg))continue;
  result.push({id,type,prompt:type==='tense'?`Определите время: ${bg} (${v.bg})`:`Образуйте форму «${v.bg}» (${v.ru}): ${grammarUnits[tense].title}; ${['аз','ти','той/тя/то','ние','вие','те'][person]}; ${form==='negative'?'отрицание':form==='question'?'вопрос':'утверждение'}${compound?`; ${gender==='f'?'женский':gender==='n'?'средний':'мужской'} род`:''}.`,bg:type==='tense'?bg:undefined,answers:type==='tense'?[grammarUnits[tense].title]:[bg],options:type==='tense'?shuffle(grammarUnits.slice(0,9).map(u=>u.title)):undefined,explanation:`${bg} · ${grammarUnits[tense].rule}`,source:v.source,skill:type==='tense'?'Различение времён':'Глагольные формы',level});
  if(result.length>=count)break;
 }
 return result;
}
type MorphTask=Task&{common?:boolean;lemmaLength?:number};
let morphologyCatalog:Promise<{kind:string;count:number;url:string}[]>|null=null;
export async function morphologyTasks(kind:'article'|'plural'|'agreement',level:Level,count=12):Promise<Task[]> {
 try{
  morphologyCatalog??=jsonResource<{kind:string;count:number;url:string}[]>('/grammar/morphology-catalog.json').catch(()=>{morphologyCatalog=null;return [];});
  const packs=shuffle((await morphologyCatalog).filter(p=>p.kind===kind));
  const recent=new Set((await db.attempts.orderBy('at').reverse().limit(500).toArray()).map(a=>a.exerciseId));
  const pool:MorphTask[]=[];
  for(const p of packs){pool.push(...await jsonResource<MorphTask[]>(p.url));if(pool.filter(t=>!recent.has(t.id)&&(level!=='A1'||t.common)).length>=count*2)break;}
  const fresh=[...shuffle(pool.filter(t=>!recent.has(t.id))),...shuffle(pool.filter(t=>recent.has(t.id)))];
  return fresh.sort((a,b)=>level==='A1'||level==='A2'?Number(!!b.common)-Number(!!a.common):0).slice(0,count).map(({common:_,lemmaLength:__,...t})=>({...t,level}));
 }catch{return [];}
}

async function practiceVerbs(count:number) {
 try {
  const catalog=await jsonResource<{url:string}[]>('/grammar/catalog.json');
  const urls=shuffle([...new Set(catalog.map(v=>v.url))]);
  const rows:typeof verbParadigms=[];
  for(const url of urls){rows.push(...await jsonResource<typeof verbParadigms>(url));if(rows.length>=count*4)break;}
  if(rows.length)return shuffle(rows.filter(v=>!verbReviewReason(v)));
 }catch{/* Built-in paradigms remain usable offline. */}
 return shuffle(verbParadigms.filter(v=>!verbReviewReason(v)));
}
