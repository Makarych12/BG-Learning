import {it,expect} from 'vitest';
import {advancedLessons} from './advanced-lessons';
import {evaluateTask} from './task-evaluation';
it('C1–C2: каждый новый урок содержит чтение, диалог и разнообразную проверяемую практику',()=>{
 expect(advancedLessons.filter(u=>u.level==='C1')).toHaveLength(3);
 expect(advancedLessons.filter(u=>u.level==='C2')).toHaveLength(3);
 const ids=advancedLessons.flatMap(u=>u.tasks.map(t=>t.id));expect(new Set(ids).size).toBe(ids.length);
 for(const u of advancedLessons){
  expect(u.reading!.bg.split(/\s+/).length).toBeGreaterThan(80);
  expect(u.conversation).toHaveLength(6);expect(u.tasks).toHaveLength(14);
  expect(new Set(u.tasks.map(t=>t.type)).size).toBeGreaterThanOrEqual(5);
  expect(new Set(u.tasks.map(t=>t.prompt)).size).toBe(u.tasks.length);
  for(const t of u.tasks){expect(evaluateTask(t,t.answers[0]),t.id).toBe(true);if(t.options&&t.type!=='order')expect(t.options).toContain(t.answers[0]);}
 }
});
