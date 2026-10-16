import { memo,useEffect,useRef,useCallback } from 'react';
const rows=['явертъуиопшщ','асдфгхйкл','зьцжбнмчюѝ'];
const Key=memo(function Key({letter,disabled,insert}:{letter:string;disabled:boolean;insert:(s:string)=>void}){return <button type="button" disabled={disabled} tabIndex={-1} data-letter={letter} onPointerDown={e=>e.preventDefault()} onClick={()=>insert(letter)} aria-label={`Ввести ${letter}`}>{letter}</button>;});
export function ReactiveKeyboard({value,onChange,disabled=false}:{value:string;onChange:(s:string)=>void;disabled?:boolean}){
 const root=useRef<HTMLDivElement>(null),latest=useRef({value,onChange,disabled}),active=useRef<HTMLElement|null>(null),timeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 latest.current={value,onChange,disabled};
 const pulse=useCallback((text:string)=>{active.current?.classList.remove('key-pulse');active.current=root.current?.querySelector<HTMLElement>(`[data-letter="${text.toLocaleLowerCase('bg')}"]`)??null;active.current?.classList.add('key-pulse');if(timeout.current)clearTimeout(timeout.current);timeout.current=setTimeout(()=>active.current?.classList.remove('key-pulse'),180);},[]);
 const insert=useCallback((text:string)=>{if(latest.current.disabled)return;pulse(text);latest.current.onChange(latest.current.value+text);},[pulse]);
 useEffect(()=>{const listen=(e:KeyboardEvent)=>{if(!latest.current.disabled&&!e.ctrlKey&&!e.metaKey&&/^[а-яѝ]$/i.test(e.key))pulse(e.key);};document.addEventListener('keydown',listen);return()=>{document.removeEventListener('keydown',listen);if(timeout.current)clearTimeout(timeout.current);};},[pulse]);
 return <div ref={root} className="reactive-keyboard" role="group" aria-label="Болгарская экранная клавиатура">{rows.map(row=><div key={row}>{[...row].map(letter=><Key key={letter} letter={letter} disabled={disabled} insert={insert}/>)}</div>)}<div><button type="button" disabled={disabled} onClick={()=>insert(' ')}>Пробел</button><button type="button" disabled={disabled} onClick={()=>onChange([...value].slice(0,-1).join(''))} aria-label="Удалить последнюю букву">⌫</button></div></div>;
}
