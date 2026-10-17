import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ListeningLab} from './ListeningLab';
vi.mock('./listening-tasks',()=>({listeningTasks:[{id:'mobile-dictation',category:'phrases',level:'A1',type:'dictation',title:'Диктант',prompt:'Запишите фразу',audioText:'Добър ден',answer:'Добър ден',translation:'Добрый день',explanation:'Полная фраза'}]}));
vi.mock('./speech',()=>{const state={status:'idle',rate:1};return {speak:vi.fn(),stopSpeech:vi.fn(),configureAudio:vi.fn(),audioState:()=>state,subscribeAudio:()=>()=>{}};});
afterEach(()=>{cleanup();localStorage.removeItem('chameleon_listening_completed');});
it('аудирование не засчитывает пустой ответ или фрагмент, полный ответ сохраняется',async()=>{
 const user=userEvent.setup(),notify=vi.fn();render(<ListeningLab notify={notify}/>);
 const input=screen.getByRole('textbox');
 await user.type(input,'ден');await user.click(screen.getByRole('button',{name:/Проверить/}));
 expect(localStorage.getItem('chameleon_listening_completed')).toBeNull();
 await user.click(screen.getByRole('button',{name:/Вперёд/}));
 await user.type(screen.getByRole('textbox'),'Добър ден');await user.click(screen.getByRole('button',{name:/Проверить/}));
 expect(JSON.parse(localStorage.getItem('chameleon_listening_completed')!)).toEqual({'mobile-dictation':true});
});
it('кнопки задают требуемый множитель скорости без перезапуска записи',async()=>{
 const {configureAudio,speak}=await import('./speech');vi.mocked(speak).mockClear();vi.mocked(configureAudio).mockClear();
 const user=userEvent.setup();render(<ListeningLab notify={vi.fn()}/>);
 await user.click(screen.getByRole('button',{name:/▶ Слушать/}));
 for(const rate of [.75,1,1.25,1.5]){await user.click(screen.getByRole('button',{name:rate+'x'}));expect(configureAudio).toHaveBeenLastCalledWith({rate});}
 expect(speak).toHaveBeenCalledTimes(1);
});
