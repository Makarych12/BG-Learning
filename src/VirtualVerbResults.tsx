import {memo,useEffect,useRef,useState,type KeyboardEvent} from 'react';
import type {VerbEntry} from './verb-search';
const rowHeight=62,gap=6;
/** Bounded, keyboard-accessible viewport; pagination and search still expose every verb. */
export const VirtualVerbResults=memo(function VirtualVerbResults({entries,selected,pending,choose}:{entries:VerbEntry[];selected:string;pending:boolean;choose:(e:VerbEntry)=>void}){
 const root=useRef<HTMLDivElement>(null),frame=useRef(0),focusFrame=useRef(0);
 const [top,setTop]=useState(0),[columns,setColumns]=useState(3);
 useEffect(()=>{const el=root.current!;const measure=()=>{const next=Number(getComputedStyle(el).getPropertyValue('--verb-columns'))||3;setColumns(next);};measure();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;observer?.observe(el);window.addEventListener('resize',measure);return()=>{observer?.disconnect();window.removeEventListener('resize',measure);cancelAnimationFrame(frame.current);cancelAnimationFrame(focusFrame.current);};},[]);
 useEffect(()=>{root.current!.scrollTop=0;setTop(0);},[entries]);
 const first=Math.max(0,Math.floor(top/rowHeight)-2)*columns,end=Math.min(entries.length,(Math.floor(top/rowHeight)+6)*columns);
 const focus=(index:number)=>{const el=root.current!,row=Math.floor(index/columns),nextTop=Math.max(0,Math.min(row*rowHeight,Math.ceil(entries.length/columns)*rowHeight-225));el.scrollTop=nextTop;setTop(nextTop);cancelAnimationFrame(focusFrame.current);focusFrame.current=requestAnimationFrame(()=>el.querySelector<HTMLButtonElement>(`[data-verb-index="${index}"]`)?.focus());};
 const key=(e:KeyboardEvent)=>{const button=(e.target as HTMLElement).closest<HTMLElement>('[data-verb-index]');if(!button)return;const index=Number(button.dataset.verbIndex);let target=index;
  if(e.key==='ArrowDown')target=index+columns;else if(e.key==='ArrowUp')target=index-columns;else if(e.key==='Home')target=0;else if(e.key==='End')target=entries.length-1;
  else if(e.key==='Tab'&&!e.shiftKey&&index===end-1&&end<entries.length)target=index+1;else if(e.key==='Tab'&&e.shiftKey&&index===first&&first>0)target=index-1;else return;
  e.preventDefault();focus(Math.max(0,Math.min(entries.length-1,target)));
 };
 return <div ref={root} className="verb-results virtual-verb-results" role="group" aria-label="Результаты поиска глаголов" onKeyDown={key} onScroll={()=>{if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;setTop(root.current?.scrollTop??0);});}}><div style={{height:Math.ceil(entries.length/columns)*rowHeight,position:'relative'}}>{entries.slice(first,end).map((entry,i)=>{const index=first+i;return <button key={entry.bg} data-verb-index={index} aria-label={`${entry.bg} — ${entry.ru}`} disabled={pending} className={selected===entry.bg?'active':''} style={{position:'absolute',left:`calc(${index%columns/columns*100}% + ${gap/2}px)`,top:Math.floor(index/columns)*rowHeight,width:`calc(${100/columns}% - ${gap}px)`,height:rowHeight-gap}} onClick={()=>choose(entry)}><strong lang="bg">{entry.bg}</strong><small>{entry.ru}</small></button>;})}</div></div>;
});
