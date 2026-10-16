import { sentenceReviewReason,railReviewQueue } from '../src/content-quality';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { railSections,railwayBank } from '../src/rail-practice';
import { railTerms } from '../src/railway';
import { grammarUnits,paradigm,verbParadigms } from '../src/curriculum';
import { dialogues } from '../src/dialogues';
import { listeningTasks } from '../src/listening-tasks';
import { voiceScenarios } from '../src/voice-scenarios';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const manifest=read('public/content/manifest.json');
const flags:{id:string;reason:string;text:string}[]=[];
const seen=new Map<string,string>();
const counts:Record<string,number>={};
const mixed=/[a-z]+[а-яѝ]|[а-яѝ]+[a-z]/i;
const reviews:Record<string,number>={};
for(const pack of manifest.packages){for(const row of read('public'+pack.url).items){
 counts[pack.kind]=(counts[pack.kind]??0)+1;
 if(pack.kind==='sentences'){const key=sentenceReviewReason(row)?'sentencesPendingReview':'sentencesEligibleForPractice';counts[key]=(counts[key]??0)+1;}
 reviews[row.review??'unspecified']=(reviews[row.review??'unspecified']??0)+1;
 if(!row.bg||!row.ru)flags.push({id:row.id,reason:'missing-text',text:row.bg??''});
 if(mixed.test(row.bg))flags.push({id:row.id,reason:'mixed-script-review',text:row.bg});
 const key=pack.kind+':'+row.bg.normalize('NFC').toLowerCase().trim()+':'+row.ru.trim();
 if(seen.has(key))flags.push({id:row.id,reason:'duplicate-of:'+seen.get(key),text:row.bg});else seen.set(key,row.id);
 for(const form of row.forms??[]){counts.forms=(counts.forms??0)+1;if(mixed.test(form.text))flags.push({id:row.id,reason:'mixed-script-form-review',text:form.text});}
}}
const catalog=read('public/grammar/catalog.json') as {bg:string;url:string}[];
let verbs=0,generatedForms=0;
for(const url of new Set(catalog.map(v=>v.url))){for(const v of read('public'+url)){
 verbs++;
 for(const key of ['present','aorist','imperfect'])if(v[key].length!==6||v[key].some((f:string)=>!f||mixed.test(f)))flags.push({id:v.bg,reason:'verb-table-review',text:key});
 for(let t=0;t<9;t++)for(let p=0;p<6;p++)for(const g of ['m','f','n'])for(const f of ['positive','negative','question']){const form=paradigm(v,t,p,g,f);generatedForms++;if(!form||form.includes('undefined')||/\bnull\b/.test(form))throw Error('Invalid paradigm '+v.bg);}
}}
const railway=railSections.map(s=>{const bank=railwayBank(s.id);return {...s,tasks:bank.length,materials:new Set(bank.map(t=>t.materialId)).size,modes:Object.fromEntries([...new Set(bank.map(t=>t.type))].map(type=>[type,bank.filter(t=>t.type===type).length]))};});
const accessibleVerbs=new Set([...catalog.map(v=>v.bg),...verbParadigms.map(v=>v.bg)]).size;
const report={date:'2026-10-16',scope:'Full structural inventory; targeted linguistic checks only. Not a certification of the corpus.',counts:{...counts,verbs,accessibleVerbs,generatedForms,railTerms:railTerms.length,grammarUnits:grammarUnits.length,grammarTasks:grammarUnits.reduce((n,u)=>n+u.tasks.length,0),dialogues:dialogues.length,listening:listeningTasks.length,voice:voiceScenarios.length},railway,sourceReviewStatuses:reviews,railReviewQueue,flags,linguisticChecks:[{issue:'цепнатина translated as скол',fix:'трещина, щель',source:'https://ibl.bas.bg/rbe/lang/bg/пукам/'},{issue:'температурно изкривяване translated as выправление',fix:'температурное искривление',source:'https://ibl.bas.bg/rbe/lang/bg/изкривяване/'},{issue:'срабатване на защитата spelling',fix:'сработване на защитата',source:'https://mgu.bg/wp-content/uploads/2025/03/Vol.-59-III-2016-49-54.pdf'},{issue:'неутрална вставка suspected calque',fix:'Retained: attested technical term',source:'https://www.rail-infra.bg/upload/608/TS-RI-007-2006%20IZM-01-2017.pdf'},{issue:'Perfect used at the start of an independent phrase',fix:'participle precedes auxiliary; negative retains auxiliary before participle',source:'https://ibl.bas.bg/izvestiya/wp-content/uploads/2024/09/01_Stancheva_2024_IIBE-XXXVII_7-56.pdf'},{issue:'Rail head mistranslated as главина (hub)',fix:'глава на релса',source:'https://www.rail-infra.bg/upload/3865/ПТПЖП_08_2021_new.pdf'}],limitations:['Russian translations and CEFR levels have not all been reviewed by a linguist.','Source paradigms are community data, not individually certified by BAS.','Flags are review candidates, not automatic linguistic corrections.','Not every verb has a Russian translation or linked bilingual examples.','Browser connection unavailable during this audit.']};
writeFileSync('data/learning-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,flags:flags.length},null,2));
