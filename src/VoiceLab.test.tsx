import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {VoiceLab} from './VoiceLab';
vi.mock('./voice-scenarios',()=>({voiceScenarios:[{id:'voice-fixture',theme:'work',themeTitle:'Работа',level:'C1',title:'Согласование',situation:'Уточните срок',partnerPromptBg:'Кога ще е готово?',partnerPromptRu:'Когда будет готово?',targetResponseBg:'Ще е готово утре.',targetResponseRu:'Будет готово завтра.',alternatives:['Утре ще е готово.'],hints:[],followUp:{partner:'Ще изпратите ли потвърждение?',target:'Ще изпратя писмено потвърждение.',targetRu:'Я отправлю письменное подтверждение.'}}]}));
vi.mock('./speech',()=>{const state={status:'idle'};return {speak:vi.fn(),stopSpeech:vi.fn(),pauseSpeech:vi.fn(),resumeSpeech:vi.fn(),configureAudio:vi.fn(),audioState:()=>state,subscribeAudio:()=>()=>{}};});
afterEach(()=>{cleanup();localStorage.removeItem('chameleon_voice_completed');});
it('письменный ответ, вторая реплика и повтор единственной ситуации работают без преждевременного завершения',async()=>{
 const user=userEvent.setup();render(<VoiceLab notify={vi.fn()}/>);
 await user.click(screen.getByRole('button',{name:/Ввод текста/}));
 await user.type(screen.getByRole('textbox'),'Ще е готово утре.');await user.click(screen.getByRole('button',{name:'Проверить'}));
 expect(JSON.parse(localStorage.getItem('chameleon_voice_completed')!)).toEqual({});
 await user.click(screen.getByRole('button',{name:/Продолжить диалог/}));
 await user.type(screen.getByRole('textbox'),'Утре ще е готово.');await user.click(screen.getByRole('button',{name:'Проверить'}));
 expect(JSON.parse(localStorage.getItem('chameleon_voice_completed')!)).toEqual({});
 await user.clear(screen.getByRole('textbox'));await user.type(screen.getByRole('textbox'),'Ще изпратя писмено потвърждение.');await user.click(screen.getByRole('button',{name:'Проверить'}));
 expect(JSON.parse(localStorage.getItem('chameleon_voice_completed')!)).toEqual({'voice-fixture':true});
 await user.click(screen.getByRole('button',{name:/Следующая ситуация/}));expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
});
it('переход отключает микрофон и поздние обработчики прежней ситуации',async()=>{
 let recorder:any;
 class Recognition {onstart:any;onresult:any;onend:any;onerror:any;abort=vi.fn();stop=vi.fn();constructor(){recorder=this;}start(){this.onstart?.();}}
 vi.stubGlobal('SpeechRecognition',Recognition);
 try{
  const user=userEvent.setup();render(<VoiceLab notify={vi.fn()}/>);
  await user.click(screen.getByRole('button',{name:/Записать ответ/}));expect(screen.getByRole('button',{name:/Остановить запись/})).toBeTruthy();
  await user.click(screen.getByRole('button',{name:/Следующая ситуация/}));
  expect(recorder.abort).toHaveBeenCalled();expect(recorder.onresult).toBeNull();expect(recorder.onerror).toBeNull();expect(screen.getByRole('button',{name:/Записать ответ/})).toBeTruthy();
 }finally{vi.unstubAllGlobals();}
});
