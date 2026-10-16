import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Task } from './library';
import RailAcademy from './RailAcademy';
import {railwayBank} from './rail-practice';
afterEach(cleanup);
it('каждая видимая карточка запускает собственный реальный банк и выбранный режим',async()=>{
 const launch=vi.fn(async(_tasks:Task[])=>{}),user=userEvent.setup();render(<RailAcademy launch={launch} notify={vi.fn()}/>);
 for(const [title,id] of [['Локомотив и оборудование','equipment'],['Техническое состояние','condition'],['Рабочее общение','communication']] as const){
  await waitFor(()=>expect((screen.getByRole('button',{name:new RegExp(title)}) as HTMLButtonElement).disabled).toBe(false));
  const previous=launch.mock.calls.length;
  await user.click(screen.getByRole('button',{name:new RegExp(title)}));
  await waitFor(()=>expect(launch.mock.calls.length).toBe(previous+1));
  const tasks=launch.mock.calls.at(-1)![0] as unknown as {id:string;type:string}[];
  const ids=new Set(railwayBank(id).map(t=>t.id));expect(tasks.length).toBe(15);expect(tasks.every(t=>ids.has(t.id))).toBe(true);
 }
 await user.selectOptions(screen.getByLabelText('Режим Railway Academy'),'correction');
 await waitFor(()=>expect(screen.getByRole('button',{name:/Рабочее общение/}).textContent).toContain('6 заданий'));
 await user.click(screen.getByRole('button',{name:/Рабочее общение/}));
 await waitFor(()=>expect(launch).toHaveBeenCalledTimes(4));
 const tasks=launch.mock.calls.at(-1)![0] as unknown as {type:string}[];
 expect(tasks.length).toBe(6);expect(tasks.every(t=>t.type==='correction')).toBe(true);
});
