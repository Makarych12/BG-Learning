import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReactiveKeyboard } from './ReactiveKeyboard';
it('содержит весь болгарский алфавит и вводит отсутствующие на русской раскладке буквы',()=>{
 const change=vi.fn();render(<ReactiveKeyboard value="" onChange={change}/>);
 for(const letter of 'абвгдежзийклмнопрстуфхцчшщъьюяѝ') expect(screen.getByRole('button',{name:`Ввести ${letter}`})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Ввести ъ'}));expect(change).toHaveBeenCalledWith('ъ');cleanup();
});
