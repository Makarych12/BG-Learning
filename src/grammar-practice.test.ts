import { it,expect,vi } from 'vitest';
import { verbTasks,morphologyTasks } from './grammar-practice';
import { db } from './storage';
import { grammarUnits } from './curriculum';
it('создаёт разные исходные спряжения для выбранного времени без отсутствующих форм',async()=>{
 const tasks=await verbTasks('B2',20,4);expect(tasks).toHaveLength(20);expect(new Set(tasks.map(t=>t.id)).size).toBe(20);
 for(const t of tasks){expect(t.prompt).toContain(grammarUnits[4].title);expect(t.answers[0]).not.toContain('undefined');expect(t.source).toMatch(/^https:/);}
 await db.attempts.add({exerciseId:tasks[0].id,correct:true,skill:'test',at:Date.now(),duration:10});
 const next=await verbTasks('B2',20,4);expect(next.map(t=>t.id)).not.toContain(tasks[0].id);
});
it('морфология загружается частями, сохраняет проверенные альтернативы и уровень занятия',async()=>{
 const task={id:'noun-form-fixture',type:'article',prompt:'Определённая форма на книга',answers:['книгата'],source:'https://en.wiktionary.org/wiki/книга',explanation:'Исходная таблица',skill:'Артикли',level:'B1',common:true};
 vi.stubGlobal('fetch',vi.fn(async(input)=>({ok:true,json:async()=>String(input).includes('catalog')?[{kind:'article',url:'/grammar/test.json',count:1}]:[task]})));
 const rows=await morphologyTasks('article','A1',10);expect(rows).toHaveLength(1);expect(rows[0].answers).toEqual(['книгата']);expect(rows[0].level).toBe('A1');vi.unstubAllGlobals();
});
