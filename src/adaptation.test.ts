import { it, expect } from 'vitest';
import { practiceLevel } from './adaptation';
it('не меняет сложность по малой выборке и ограничивает изменение одним уровнем',()=>{
 expect(practiceLevel('B1',Array(10).fill({correct:true}))).toBe('B1');
 expect(practiceLevel('B1',Array(30).fill({correct:true}))).toBe('B2');
 expect(practiceLevel('B1',Array(30).fill({correct:false}))).toBe('A2');
 expect(practiceLevel('A1',Array(30).fill({correct:false}))).toBe('A1');
 expect(practiceLevel('C2',Array(30).fill({correct:true}))).toBe('C2');
});
