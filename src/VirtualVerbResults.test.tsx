import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {VirtualVerbResults} from './VirtualVerbResults';
afterEach(cleanup);
it('ограничивает DOM и позволяет клавиатурой выбрать последний глагол страницы',async()=>{
 const entries=Array.from({length:40},(_,i)=>({bg:'глагол'+i,ru:'перевод'+i})),choose=vi.fn(),user=userEvent.setup();
 render(<VirtualVerbResults entries={entries} choose={choose} selected="" pending={false}/>);
 expect(screen.getAllByRole('button').length).toBeLessThan(40);
 const first=screen.getByRole('button',{name:'глагол0 — перевод0'});first.focus();await user.keyboard('{End}');
 await waitFor(()=>expect(document.activeElement?.getAttribute('aria-label')).toBe('глагол39 — перевод39'));
 await user.keyboard('{Enter}');expect(choose).toHaveBeenCalledWith(entries[39]);
});
