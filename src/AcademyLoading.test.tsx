import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentHub from './ContentHub';
import {defaultSettings} from './storage';
import type {LessonUnit} from './grammar-units';
const {load}=vi.hoisted(()=>({load:vi.fn()}));
vi.mock('./advanced-lessons',()=>({loadAdvancedLesson:load}));
vi.mock('./hub-data',()=>({useHubData:()=>({ready:true,error:false,data:{grammarUnits:['Первая программа','Вторая программа'].map((title,i)=>({id:'advanced-fixture-'+i,level:'C2',title,rule:'Описание',formation:'',contrast:'',examples:[],tasks:[],taskCount:16,summaryOnly:true})),dialogues:[],railTerms:[],railExamples:[],railSources:{},photos:[]}})}));
vi.mock('./library',async original=>({...await original<typeof import('./library')>(),getCatalog:vi.fn(async()=>({packages:[],counts:{words:0}}))}));
vi.spyOn(window,'scrollBy').mockImplementation(()=>{});
afterEach(()=>{cleanup();load.mockReset();});
const full=(id:string):LessonUnit=>({id,level:'C2',title:'Содержание '+id,rule:'Полное правило',formation:'Образование',contrast:'Отличия',examples:[],tasks:[],source:'/test'});
it('быстрое переключение не показывает запоздалое содержимое прежней карточки',async()=>{
 const pending=new Map<string,(u:LessonUnit)=>void>();load.mockImplementation(id=>new Promise<LessonUnit>(resolve=>pending.set(id,resolve)));
 const user=userEvent.setup();render(<ContentHub mode="courses" profile={{...defaultSettings,level:'C2'}} notify={vi.fn()} onRefresh={vi.fn()}/>);
 await user.click(screen.getByRole('button',{name:/Первая программа/}));await user.click(screen.getByRole('button',{name:/Вторая программа/}));
 await act(async()=>pending.get('advanced-fixture-0')!(full('advanced-fixture-0')));
 expect(screen.queryByRole('heading',{name:'Содержание advanced-fixture-0'})).toBeNull();
 await act(async()=>pending.get('advanced-fixture-1')!(full('advanced-fixture-1')));
 expect(screen.getByRole('heading',{name:'Содержание advanced-fixture-1'})).toBeTruthy();
});
it('неудачную загрузку выбранного урока можно повторить без смены карточки',async()=>{
 load.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce(full('advanced-fixture-0'));
 const user=userEvent.setup();render(<ContentHub mode="courses" profile={{...defaultSettings,level:'C2'}} notify={vi.fn()} onRefresh={vi.fn()}/>);
 await user.click(screen.getByRole('button',{name:/Первая программа/}));
 await user.click(await screen.findByRole('button',{name:'Повторить загрузку урока'}));
 expect(await screen.findByRole('heading',{name:'Содержание advanced-fixture-0'})).toBeTruthy();expect(load).toHaveBeenCalledTimes(2);
});
