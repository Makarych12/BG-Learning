import {useEffect,useId,useState} from 'react';
import type {LessonUnit} from './grammar-units';
export default function WritingWorkshop({lessonId,workshop}:{lessonId:string;workshop:NonNullable<LessonUnit['workshop']>}){
 const inputId=useId(),key=`chameleon-writing-draft:${lessonId}`;
 const [draft,setDraft]=useState(()=>{try{return localStorage.getItem(key)??'';}catch{return '';}});
 useEffect(()=>{const timer=setTimeout(()=>{try{localStorage.setItem(key,draft);}catch{/* Draft stays editable when storage is full. */}},400);return()=>clearTimeout(timer);},[draft,key]);
 return <section className="writing-workshop"><h3>Аргументация: самостоятельный ответ</h3><p>{workshop.prompt}</p>
  <label htmlFor={inputId}>Ваш текст на болгарском</label><textarea id={inputId} lang="bg" rows={7} maxLength={6000} value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Сформулируйте позицию, основания и следующий шаг…"/>
  <p className="editorial-note">Самопроверка по критериям. Свободные формулировки не оцениваются автоматически.</p>
  <ul>{workshop.criteria.map(criterion=><li key={criterion}>{criterion}</li>)}</ul>
  <details><summary>Сопоставить с примером ответа</summary><p lang="bg">{workshop.model}</p></details>
 </section>;
}
