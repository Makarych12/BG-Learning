import { it,expect,vi,afterEach } from 'vitest';
import { render,screen,cleanup,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerbReference from './VerbReference';
import { verbParadigms,paradigm } from './curriculum';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('поиск, выбор разных глаголов, девять времён и шесть лиц реально связаны с таблицей и заданием',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>verbParadigms})));
 const launch=vi.fn(),user=userEvent.setup();render(<VerbReference launch={launch} notify={vi.fn()}/>);
 const search=screen.getByRole('textbox',{name:'Поиск в полном справочнике глаголов'});
 for(const word of ['чета','пиша','усмихвам се']){
  await user.clear(search);await user.type(search,word);await user.click(screen.getByRole('button',{name:new RegExp('^'+word+' ')}));
  const v=verbParadigms.find(v=>v.bg===word)!;
  expect(screen.getByRole('heading',{name:word})).toBeTruthy();
  for(let tense=0;tense<9;tense++){
   await user.selectOptions(screen.getByLabelText('Время полного справочника'),String(tense));
   const table=document.querySelector('.conjugation-table')!;
   expect(within(table as HTMLElement).getAllByRole('button')).toHaveLength(6);
   for(let p=0;p<6;p++)expect(table.textContent).toContain(paradigm(v,tense,p));
  }
 }
 await user.selectOptions(screen.getByLabelText('Время полного справочника'),'3');
 await user.selectOptions(screen.getByLabelText('Род полного справочника'),'f');
 expect(document.querySelector('.conjugation-table')!.textContent).toContain('усмихвала се е');
 await user.selectOptions(screen.getByLabelText('Тип высказывания полного справочника'),'negative');
 expect(document.querySelector('.conjugation-table')!.textContent).toContain('не се е усмихвала');
 await user.click(screen.getByRole('button',{name:'Написать формы'}));
 expect(launch.mock.calls[0][0]).toHaveLength(6);expect(launch.mock.calls[0][0][2].answers).toEqual(['не се е усмихвала']);
});
it('пагинация не скрывает результаты после первых сорока',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>verbParadigms})));
 const user=userEvent.setup();render(<VerbReference launch={vi.fn()} notify={vi.fn()}/>);
 await user.click(screen.getByRole('button',{name:'Дальше'}));
 expect(screen.getByText(`41–80 из ${verbParadigms.length}`)).toBeTruthy();
});
