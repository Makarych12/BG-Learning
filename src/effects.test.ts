import {it,expect} from 'vitest';
import {modestHardware} from './effects';
it('автоматически облегчает слабые устройства, сохраняя эффекты на мощных и при неизвестных характеристиках',()=>{
 expect(modestHardware({deviceMemory:2,hardwareConcurrency:8})).toBe(true);
 expect(modestHardware({hardwareConcurrency:4})).toBe(true);
 expect(modestHardware({deviceMemory:8,hardwareConcurrency:8})).toBe(false);
 expect(modestHardware({})).toBe(false);
 expect(modestHardware({hardwareConcurrency:0})).toBe(false);
});
