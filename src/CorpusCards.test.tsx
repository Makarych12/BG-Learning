import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { render,screen,waitFor,cleanup,fireEvent } from '@testing-library/react';
import { contentDB,type Lexeme } from './library';
import { db,defaultSettings,exportProgress,importProgress } from './storage';
import CorpusCards from './CorpusCards';
vi.mock('./library',async original=>{const actual=await original<typeof import('./library')>();return {...actual,getCatalog:vi.fn(async()=>({schema:1,version:'test',counts:{words:2},packages:[]})),installContent:vi.fn(async()=>{})};});
const word:Lexeme={id:'wiki-chair',bg:'стол',ru:'стул',stress:'сто́л',pos:'noun',senses:[{gloss:'стул',tags:[]}],grammar:'существительное · мужской род',forms:[],synonyms:[],antonyms:[],related:[],ipa:[],categories:[],examples:[],source:'https://ru.wiktionary.org/wiki/стол',license:'CC BY-SA 4.0',review:'community',search:['стол','стул'],packId:'test'};
beforeEach(async()=>{await contentDB.lexemes.clear();await contentDB.sentences.clear();await db.memory.clear();await db.attempts.clear();await db.settings.clear();await db.settings.put({...defaultSettings,onboarded:true});await contentDB.lexemes.bulkPut([word,{...word,id:'wiki-thought',bg:'мисъл',ru:'мысль',stress:null,search:['мисъл','мысль']}]);});
afterEach(()=>cleanup());
it('открывает фото из общего словаря, восстанавливает очередь и сохраняет FSRS',async()=>{
 const refresh=vi.fn(),notify=vi.fn();let view=render(<CorpusCards notify={notify} onReview={refresh}/>);
 const title=await screen.findByText('сто́л');fireEvent.click(title.closest('button')!);
 await screen.findByRole('button',{name:'Открыть значение'});
 expect(screen.getByAltText('стол')).toBeTruthy();
 await waitFor(async()=>expect((await db.settings.get('profile'))?.cardSession?.ids).toEqual(['wiki-chair']));
 view.unmount();view=render(<CorpusCards notify={notify} onReview={refresh}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Открыть значение'}));
 expect(await screen.findByRole('heading',{name:'стул'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Помню'}));
 await screen.findByText('Все повторения сохранены');
 expect((await db.memory.get('wiki-chair:recognition'))?.card.reps).toBe(1);expect(refresh).toHaveBeenCalled();
});
it('резервная копия сохраняет очередь и отклоняет повреждённый индекс до очистки прогресса',async()=>{
 await db.settings.update('profile',{cardSession:{ids:['wiki-chair'],index:0,skill:'production'}});
 const backup=JSON.parse(JSON.stringify(await exportProgress()));await importProgress(backup);
 expect((await db.settings.get('profile'))?.cardSession?.skill).toBe('production');
 backup.settings[0].cardSession.index=10;await expect(importProgress(backup)).rejects.toThrow('очередь карточек');
 expect((await db.settings.get('profile'))?.cardSession?.index).toBe(0);
});
