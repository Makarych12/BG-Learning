import {PhotoImage} from "./PhotoImage";
import { useState,useMemo } from 'react';
import { Volume2, ArrowRight } from 'lucide-react';
import { photos } from './photo-data';
import { speak } from './speech';
import type { Task } from './library';
export function PhotoGallery({ notify, launch }: { notify: (s:string)=>void; launch: (t:Task[])=>void }) {
  const [query,setQuery]=useState(''),[page,setPage]=useState(0);
  const rows=useMemo(()=>photos.filter(p=>(p.bg+' '+p.subject).toLowerCase().includes(query.toLowerCase())),[query]);
  return <section className="photo-gallery"><div className="section-title"><div><h3>Мир в фотографиях · {photos.length}</h3><p>Предметы, природа, инструменты и железнодорожное оборудование. Файлы уменьшены и сжаты; ссылки ведут к оригиналам.</p></div></div><input aria-label="Поиск фотографий" placeholder="Название по-болгарски или английский предмет…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><div className="photo-gallery-grid">{rows.slice(page*24,page*24+24).map(p=><article className="panel photo-card" key={p.id}><PhotoImage src={p.path} alt={p.bg} loading="lazy" decoding="async" onLoad={e=>e.currentTarget.classList.add("is-loaded")} width="300" height="200"/><div><h3 lang="bg">{p.bg}<button className="icon-btn" onClick={()=>speak(p.bg,notify)} aria-label={`Озвучить ${p.bg}`}><Volume2 size={17}/></button></h3><small>{p.subject}</small><a href={p.source} target="_blank" rel="noreferrer">{p.author} · {p.license}</a><button className="text-btn" onClick={()=>launch([{id:'gallery-'+p.id,type:'photo-name',prompt:'Назовите предмет по-болгарски',image:p.path,answers:[p.bg],explanation:p.bg,source:p.source,skill:'Фото и лексика',level:'A2'}])}>Вспомнить слово <ArrowRight size={14}/></button></div></article>)}</div>{!rows.length&&<p>По этому запросу фотографий нет.</p>}<div className="pagination"><button className="btn secondary" disabled={!page} onClick={()=>setPage(p=>p-1)}>Назад</button><span>{page+1} / {Math.max(1,Math.ceil(rows.length/24))}</span><button className="btn secondary" disabled={(page+1)*24>=rows.length} onClick={()=>setPage(p=>p+1)}>Дальше</button></div></section>;
}
