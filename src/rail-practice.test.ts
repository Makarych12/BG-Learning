import { describe,it,expect } from 'vitest';
import { railwayBank,railSections,selectRailSession } from './rail-practice';
import { railReviewQueue } from './content-quality';
import { evaluateTask } from './practice';
describe('Railway Academy — реальные банки и история',()=>{
 for(const section of railSections)it(section.title,()=>{
  const bank=railwayBank(section.id);
  expect(new Set(bank.map(t=>t.materialId)).size).toBeGreaterThanOrEqual(100);
  expect(new Set(bank.map(t=>t.id)).size).toBe(bank.length);
  expect(new Set(bank.map(t=>t.type)).size).toBeGreaterThanOrEqual(6);
  for(const t of bank){expect(Object.keys(railReviewQueue)).not.toContain(t.answers[0]);expect(t.explanation).toBeTruthy();expect(evaluateTask(t,t.answers[0])).toBe(true);if(t.options&&t.type!=='order')expect(t.options).toContain(t.answers[0]);}
  const first=selectRailSession(bank,100,[]);
  expect(first).toHaveLength(100);expect(new Set(first.map(t=>t.materialId)).size).toBe(100);
  const history=first.map(t=>({exerciseId:t.id,correct:true,at:1}));
  const next=selectRailSession(bank,15,history);
  expect(next.every(t=>!first.some(old=>old.materialId===t.materialId))).toBe(true);
  const failed={exerciseId:first[0].id,correct:false,at:2};
  expect(selectRailSession(bank,15,[...history,failed]).some(t=>t.materialId===first[0].materialId)).toBe(true);
  for(const mode of ['technical','dictation','order','dialogue'] as const){const rows=selectRailSession(bank,15,[],mode);expect(rows).toHaveLength(15);expect(rows.every(t=>t.type===mode)).toBe(true);}
 });
 it('при исчерпании возвращает конечную сессию без повторов',()=>{const bank=railwayBank('communication').slice(0,12);const result=selectRailSession(bank,100,bank.map(t=>({exerciseId:t.id,correct:true,at:1})));expect(result.length).toBe(new Set(bank.map(t=>t.materialId)).size);});
});
