import {it,expect} from 'vitest';
import {academyCatalog} from './academy-catalog';
import {loadAdvancedLesson} from './advanced-lessons';
import {evaluateTask} from './task-evaluation';
it('каталог C1–C2 содержит только метаданные: по 20 уроков без текстов и упражнений',()=>{
 for(const level of ['C1','C2'])expect(academyCatalog.filter(u=>u.level===level)).toHaveLength(20);
 for(const u of academyCatalog){expect(u.summaryOnly).toBe(true);expect(u.tasks).toHaveLength(0);expect(u.reading).toBeUndefined();expect(u.taskCount).toBe(16);}
});
it('40 отдельных уроков содержат 640 уникальных заданий, чтение, диалоги и аудирование',async()=>{
 const lessons=await Promise.all(academyCatalog.map(u=>loadAdvancedLesson(u.id)));
 const tasks=lessons.flatMap(u=>u.tasks);expect(tasks).toHaveLength(640);
 expect(new Set(tasks.map(t=>t.id)).size).toBe(640);
 expect(new Set(tasks.map(t=>t.prompt.trim())).size).toBe(640);
 for(const u of lessons){
  expect(u.reading!.bg.split(/\s+/).length,u.id).toBeGreaterThan(80);
  expect(u.rule.length+u.formation.length+u.contrast.length,u.id).toBeGreaterThan(650);
  expect(u.conversation,u.id).toHaveLength(6);expect(u.examples,u.id).toHaveLength(6);expect(u.tasks,u.id).toHaveLength(16);
  expect(new Set(u.tasks.map(t=>t.type)).size,u.id).toBeGreaterThanOrEqual(5);
  expect(new Set(u.tasks.map(t=>t.prompt)).size,u.id).toBe(u.tasks.length);
  expect(u.tasks.some(t=>t.type==='listen-choice'),u.id).toBe(true);expect(u.tasks.some(t=>t.type==='dictation'),u.id).toBe(true);
  for(const t of u.tasks){expect(evaluateTask(t,t.answers[0]),t.id).toBe(true);if(t.options&&t.type!=='order')expect(t.options,t.id).toContain(t.answers[0]);}
  for(const e of u.examples)expect(e.bg&&e.ru,u.id).toBeTruthy();
 }
});
it('одновременное открытие одного урока использует один Promise, неизвестный урок не зависает',async()=>{
 const first=loadAdvancedLesson('advanced-evidence'),next=loadAdvancedLesson('advanced-evidence');expect(first).toBe(next);
 await expect(loadAdvancedLesson('advanced-nonexistent')).rejects.toThrow('Урок не найден');
});
