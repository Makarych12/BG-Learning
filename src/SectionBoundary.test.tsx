import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {SectionBoundary,recoverModuleVersion} from './SectionBoundary';
const reload=vi.fn();
beforeEach(()=>{sessionStorage.clear();reload.mockClear();});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
function environment(online=true,serviceWorker?:unknown){
 vi.stubGlobal('navigator',{onLine:online,serviceWorker});
 vi.stubGlobal('window',{location:{href:'https://app.test/',reload}});
}
it('обновляет старую версию после ошибки импорта только один раз, сохраняя данные',async()=>{
 environment();localStorage.setItem('practice-fixture','saved');
 const error=new TypeError('Failed to fetch dynamically imported module: /assets/old.js');
 await recoverModuleVersion(error);await recoverModuleVersion(error);
 expect(reload).toHaveBeenCalledTimes(1);expect(localStorage.getItem('practice-fixture')).toBe('saved');
 localStorage.removeItem('practice-fixture');
});
it('активирует ожидающую PWA перед перезагрузкой',async()=>{
 const events=new EventTarget();const update=vi.fn(async()=>{});
 const postMessage=vi.fn(()=>events.dispatchEvent(new Event('controllerchange')));
 environment(true,{getRegistration:async()=>({update,waiting:{postMessage}}),addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 await recoverModuleVersion(new TypeError('Failed to fetch dynamically imported module: /assets/old.js'));
 expect(update).toHaveBeenCalledOnce();expect(postMessage).toHaveBeenCalledWith({type:'SKIP_WAITING'});expect(reload).toHaveBeenCalledOnce();
});
it('не перезагружает офлайн и не принимает обычную ошибку JavaScript за смену версии',async()=>{
 environment(false);await recoverModuleVersion(new TypeError('Failed to fetch dynamically imported module: /assets/old.js'));
 expect(reload).not.toHaveBeenCalled();expect(sessionStorage.length).toBe(0);
 environment();await recoverModuleVersion(new TypeError('Cannot read properties of undefined'));
 expect(reload).not.toHaveBeenCalled();
});
it('ошибка раздела сохраняет доступ к меню и показывает восстановление',()=>{
 vi.spyOn(console,'error').mockImplementation(()=>{});
 function Broken():never{throw new Error('fixture render failure');}
 render(<><nav>Меню приложения</nav><SectionBoundary><Broken/></SectionBoundary></>);
 expect(screen.getByText('Меню приложения')).toBeTruthy();expect(screen.getByRole('alert')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Обновить приложение'})).toBeTruthy();
});
