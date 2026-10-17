import {it,expect} from 'vitest';
import {modestHardware} from './effects';
it('автоматически облегчает слабые устройства, сохраняя эффекты на мощных и при неизвестных характеристиках',()=>{
 expect(modestHardware({deviceMemory:2,hardwareConcurrency:8})).toBe(true);
 expect(modestHardware({hardwareConcurrency:4})).toBe(true);
 expect(modestHardware({deviceMemory:8,hardwareConcurrency:8})).toBe(false);
 expect(modestHardware({})).toBe(false);
 expect(modestHardware({hardwareConcurrency:0})).toBe(false);
});
it('Android с восемью ядрами сразу использует статичную графику без ожидания профиля',()=>{
 expect(modestHardware({userAgent:'Mozilla/5.0 (Linux; Android 14)',deviceMemory:8,hardwareConcurrency:8})).toBe(true);
 expect(modestHardware({userAgent:'Mozilla/5.0 (X11; Linux x86_64)',deviceMemory:8,hardwareConcurrency:8})).toBe(false);
});
