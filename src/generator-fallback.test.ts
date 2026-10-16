import {it,expect} from 'vitest';
import {contentDB,type Sentence} from './library';
import {generateTasks,evaluateTask} from './practice';
it('перевод BG → RU использует встроенный перевод примера при отсутствии отдельного массива переводов',async()=>{
 await contentDB.sentences.clear();
 const example:Sentence={id:'wikiex-translation-fixture',bg:'Това е моят влак.',ru:'Это мой поезд.',translations:[],author:'Источник примера',source:'https://example.org/fixture',license:'fixture',review:'community',audio:null,words:4,search:[],packId:'fixture'};
 await contentDB.sentences.put(example);const tasks=await generateTasks('translate-bg','B2',1);
 expect(tasks).toHaveLength(1);expect(tasks[0].answers).toEqual([example.ru]);expect(evaluateTask(tasks[0],example.ru)).toBe(true);expect(tasks[0].sourceLabel).toBe('Источник примера · fixture');
 await contentDB.sentences.put({...example,id:'short-fixture',bg:'Ще ти се!',ru:'Я тебе дам!',words:3});
 const listening=await generateTasks('multi','B2',5);expect(listening).toHaveLength(1);expect(listening[0].answers.length).toBeGreaterThan(0);expect(evaluateTask(listening[0],JSON.stringify(listening[0].answers))).toBe(true);
 expect(await contentDB.sentences.count()).toBe(2);
 await contentDB.sentences.clear();
});
